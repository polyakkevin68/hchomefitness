import "server-only";
import { Prisma, type PrismaClient } from "../generated/prisma/client";
import type { CatalogAdapter, ProductAttribute } from "./adatmodellek";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { keszletInformacio } from "./keszlet-allapot";
import { normalizalKatalogusOldalt, KATALOGUS_OLDALMERET } from "./katalogus-lapozas";
import type { KatalogusKereso } from "./adatmodellek";
import { forrasKategoriak, forrasKategoriakMegjelenitesiNevhez, katalogusKategoria, rendezettKatalogusKategoriak } from "./katalogus-kategoriak";

function readAttributes(value: Prisma.JsonValue): ProductAttribute[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object") return [];
    const id = entry.id;
    const name = entry.name;
    const attributeValue = entry.value;
    return typeof id === "string" && typeof name === "string" && typeof attributeValue === "string"
      ? [{ id, name, value: attributeValue }]
      : [];
  });
}

export function createUnasDatabaseAdapter(prisma: PrismaClient, includeUnpublished = false): CatalogAdapter {
  let katalogusMetaadat: {
    ervenyesEddig: number;
    adat: Promise<{ kategoriak: string[]; osszesTermekSzama: number }>;
  } | null = null;
  const katalogusOldalak = new Map<string, { ervenyesEddig: number; adat: Promise<import("./adatmodellek").KatalogusOldal> }>();
  const alapszuro: Prisma.ProductWhereInput = {
    brand: "HC Home Fitness",
    isActive: true,
    ...(includeUnpublished ? {} : { isPublished: true }),
    isTestFixture: false,
    category: { in: forrasKategoriak },
  };
  const atalakitTermeket = (product: Prisma.ProductGetPayload<{ include: { keszlet: true } }>) => {
    const category = katalogusKategoria(product.category);
    if (!category) return null;
    return {
      id: product.id,
      sourceId: product.sourceId,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      category,
      priceHuf: product.priceHuf,
      netPriceHuf: product.netPriceHuf === null ? undefined : Number(product.netPriceHuf),
      description: product.description,
      longDescription: product.longDescription,
      imageUrls: product.imageUrls,
      attributes: readAttributes(product.attributes),
      isPurchasable: product.isPurchasable,
      isPublished: product.isPublished,
      source: product.source === "unas" ? "unas" as const : "fixture" as const,
      isTestFixture: product.isTestFixture,
      keszlet: keszletInformacio(product.keszlet, readAppConfig().STOCK_MAX_AGE_SECONDS),
    };
  };
  const atalakitTermekeket = (products: Prisma.ProductGetPayload<{ include: { keszlet: true } }>[]) => products
    .map(atalakitTermeket)
    .filter((product): product is NonNullable<typeof product> => product !== null);

  const getKatalogusMetaadat = () => {
    if (katalogusMetaadat && katalogusMetaadat.ervenyesEddig > Date.now()) return katalogusMetaadat.adat;

    const adat = Promise.all([
      prisma.product.findMany({ where: alapszuro, select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } }),
      prisma.product.count({ where: alapszuro }),
    ]).then(([kategoriakSorai, osszesTermekSzama]) => ({
      kategoriak: rendezettKatalogusKategoriak(kategoriakSorai.map((row) => row.category)),
      osszesTermekSzama,
    }));
    katalogusMetaadat = { ervenyesEddig: Date.now() + 30_000, adat };
    void adat.catch(() => {
      if (katalogusMetaadat?.adat === adat) katalogusMetaadat = null;
    });
    return adat;
  };

  return {
    async listProducts() {
      const products = await prisma.product.findMany({
        where: alapszuro,
        include: { keszlet: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
      return atalakitTermekeket(products);
    },
    async getProductBySlug(slug) {
      const product = await prisma.product.findFirst({
        where: { ...alapszuro, slug },
        include: { keszlet: true },
      });
      return product ? atalakitTermeket(product) : null;
    },
    searchProducts(kereses: KatalogusKereso) {
      const term = kereses.keres?.trim();
      const kategoria = kereses.kategoria?.trim();
      const kulcs = JSON.stringify([term ?? "", kategoria ?? "", kereses.rendezes ?? "", kereses.oldal ?? "1", kereses.oldalmeret ?? KATALOGUS_OLDALMERET]);
      const gyorsitotarElem = katalogusOldalak.get(kulcs);
      if (gyorsitotarElem && gyorsitotarElem.ervenyesEddig > Date.now()) return gyorsitotarElem.adat;

      const adat = (async () => {
      const where: Prisma.ProductWhereInput = {
        ...alapszuro,
        ...(kategoria ? { category: { in: forrasKategoriakMegjelenitesiNevhez(kategoria) } } : {}),
        ...(term ? {
          OR: [
            { sku: { contains: term, mode: "insensitive" } },
            { name: { contains: term, mode: "insensitive" } },
            { category: { contains: term, mode: "insensitive" } },
            { category: { in: forrasKategoriakMegjelenitesiNevhez(term) } },
            { description: { contains: term, mode: "insensitive" } },
          ],
        } : {}),
      };
      const oldalmeret = kereses.oldalmeret ?? KATALOGUS_OLDALMERET;
      const [metaadat, szurtTermekekSzama] = await Promise.all([
        getKatalogusMetaadat(),
        term || kategoria ? prisma.product.count({ where }) : getKatalogusMetaadat().then((meta) => meta.osszesTermekSzama),
      ]);
      const lapozas = normalizalKatalogusOldalt(kereses.oldal, szurtTermekekSzama, oldalmeret);
      const orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = kereses.rendezes === "ar-novekvo"
        ? { priceHuf: "asc" }
        : kereses.rendezes === "ar-csokkeno"
          ? { priceHuf: "desc" }
          : kereses.rendezes === "nev" ? { name: "asc" } : [{ category: "asc" }, { name: "asc" }];
      const products = await prisma.product.findMany({
        where,
        include: { keszlet: true },
        orderBy,
        skip: lapozas.kihagyas,
        take: oldalmeret,
      });
      return {
        termekek: atalakitTermekeket(products),
        szurtTermekekSzama,
        osszesTermekSzama: metaadat.osszesTermekSzama,
        kategoriak: metaadat.kategoriak,
        oldal: lapozas.oldal,
        oldalakSzama: lapozas.oldalakSzama,
      };
      })();
      katalogusOldalak.set(kulcs, { ervenyesEddig: Date.now() + 5_000, adat });
      while (katalogusOldalak.size > 100) katalogusOldalak.delete(katalogusOldalak.keys().next().value as string);
      void adat.catch(() => katalogusOldalak.delete(kulcs));
      return adat;
    },
  };
}
