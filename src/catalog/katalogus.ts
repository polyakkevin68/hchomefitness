import "server-only";
import { fixtureAdapter } from "./proba-adapter";
import type { CatalogAdapter, KatalogusKereso, KatalogusOldal } from "./adatmodellek";
import { filterCatalog } from "./katalogus-szures";
import { normalizalKatalogusOldalt, KATALOGUS_OLDALMERET } from "./katalogus-lapozas";
import { readAppConfig } from "@/lib/kornyezet-beallitas";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { createUnasDatabaseAdapter } from "./unas-adatbazis-adapter";
import { katalogusKategoria, rendezettKatalogusKategoriak } from "./katalogus-kategoriak";

const unasAdapter = createUnasDatabaseAdapter(prisma);
const unasElozetesAdapter = createUnasDatabaseAdapter(prisma, true);

function getAdapter(): CatalogAdapter {
  const config = readAppConfig();
  if (config.CATALOG_ADAPTER === "fixture" && config.APP_ENV !== "production") return fixtureAdapter;
  if (config.CATALOG_ADAPTER === "unas") return unasAdapter;
  if (config.CATALOG_ADAPTER === "unas-preview" && config.APP_ENV === "development") return unasElozetesAdapter;
  return { async listProducts() { return []; } };
}

export async function listProducts() {
  const products = await getAdapter().listProducts();
  return products.flatMap((product) => {
    const category = katalogusKategoria(product.category);
    return category ? [{ ...product, category }] : [];
  });
}

export async function getProductBySlug(slug: string) {
  const adapter = getAdapter();
  const product = adapter.getProductBySlug
    ? await adapter.getProductBySlug(slug)
    : (await adapter.listProducts()).find((termek) => termek.slug === slug) ?? null;
  if (!product) return null;
  const category = katalogusKategoria(product.category);
  return category ? { ...product, category } : null;
}

export async function getProductRecommendations(slug: string) {
  const termek = await getProductBySlug(slug);
  if (!termek?.id || termek.source !== "unas" || termek.isTestFixture) return [];
  const ajanlok = await prisma.termekAjanlo.findMany({
    where: {
      forrasTermekId: termek.id,
      aktiv: true,
      celTermek: { brand: "HC Home Fitness", source: "unas", isActive: true, isPublished: true, isTestFixture: false },
    },
    orderBy: [{ sorrend: "asc" }, { createdAt: "asc" }],
    take: 8,
    select: { celTermek: { select: { slug: true } } },
  });
  const slugs = [...new Set(ajanlok.map(({ celTermek }) => celTermek.slug).filter((ajanloSlug) => ajanloSlug !== slug))];
  const termekek = await Promise.all(slugs.map((ajanloSlug) => getProductBySlug(ajanloSlug)));
  return termekek.filter((ajanlo): ajanlo is NonNullable<typeof ajanlo> => Boolean(ajanlo && ajanlo.source === "unas" && !ajanlo.isTestFixture)).slice(0, 4);
}

export async function getPublishedReviews(slug: string) {
  const termek = await getProductBySlug(slug);
  if (!termek?.id || termek.source !== "unas" || termek.isTestFixture) return [];
  return prisma.termekErtekeles.findMany({ where: { productId: termek.id, allapot: "PUBLISHED", igazoltVasarlas: true }, orderBy: { createdAt: "desc" }, take: 50, select: { csillag: true, szoveg: true, createdAt: true } });
}

export async function getActivePromotionProducts() {
  const now = new Date();
  const [termekek, kuponok] = await Promise.all([
    listProducts(),
    prisma.kupon.findMany({ where: { aktiv: true, indulAt: { lte: now }, lejarAt: { gt: now } }, select: { kod: true, kategoriak: true, cikkszamok: true, minimumHuf: true, osszevonhato: true }, orderBy: { lejarAt: "asc" } }),
  ]);
  return termekek.filter((termek) => termek.source === "unas" && !termek.isTestFixture && termek.isPurchasable && termek.keszlet?.allapot === "friss" && termek.keszlet.mennyiseg > 0)
    .flatMap((termek) => {
      const alkalmazhato = kuponok.filter((kupon) => (!kupon.kategoriak.length && !kupon.cikkszamok.length) || kupon.kategoriak.includes(termek.category) || kupon.cikkszamok.includes(termek.sku));
      return alkalmazhato.length ? [{ termek, kuponok: alkalmazhato }] : [];
    });
}

export async function getPublishedContentLinks() {
  return prisma.tartalmiOldal.findMany({ where: { kintVan: true }, select: { cim: true, slug: true }, orderBy: { cim: "asc" }, take: 50 });
}

export async function getCatalogPage(kereses: KatalogusKereso): Promise<KatalogusOldal> {
  const adapter = getAdapter();
  if (adapter.searchProducts) return adapter.searchProducts(kereses);

  const termekek = (await adapter.listProducts()).flatMap((product) => {
    const category = katalogusKategoria(product.category);
    return category ? [{ ...product, category }] : [];
  });
  const szurtTermekek = filterCatalog(termekek, kereses);
  const oldalmeret = kereses.oldalmeret ?? KATALOGUS_OLDALMERET;
  const lapozas = normalizalKatalogusOldalt(kereses.oldal, szurtTermekek.length, oldalmeret);
  return {
    termekek: szurtTermekek.slice(lapozas.kihagyas, lapozas.kihagyas + oldalmeret),
    szurtTermekekSzama: szurtTermekek.length,
    osszesTermekSzama: termekek.length,
    kategoriak: rendezettKatalogusKategoriak(termekek.map((termek) => termek.category)),
    oldal: lapozas.oldal,
    oldalakSzama: lapozas.oldalakSzama,
  };
}
