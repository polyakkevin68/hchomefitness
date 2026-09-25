import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { getProductRecommendations } from "./katalogus";

const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const helyiAdatbazis = dbUrl !== null && ["localhost", "127.0.0.1", "::1"].includes(dbUrl.hostname) && dbUrl.pathname === "/hc_webaruhaz";

describe.skipIf(!helyiAdatbazis)("termék-kiegészítőajánlók PostgreSQL-en", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("csak aktív, közzétett, valódi HC/UNAS célterméket jelenít meg", async () => {
    const token = randomBytes(8).toString("hex");
    const create = (sourceId: string, slug: string, brand = "HC Home Fitness", isPublished = true, source = "unas") => prisma.product.create({ data: {
      source, sourceId: `${sourceId}-${token}`, sku: `${sourceId}-${token}`, slug: `${slug}-${token}`,
      name: `${slug} termék`, brand, category: "Futópadok", priceHuf: 10_000,
      isPublished, isActive: true, isTestFixture: false, isPurchasable: true, lastImportedAt: new Date(),
    } });
    const forras = await create("hc-forras", "ajanlo-forras");
    const cel = await create("hc-cel", "ajanlo-cel");
    const nemKozzetett = await create("hc-rejtett", "ajanlo-rejtett", "HC Home Fitness", false);
    const idegen = await create("idegen", "ajanlo-idegen", "Más márka");
    try {
      await prisma.termekAjanlo.createMany({ data: [
        { forrasTermekId: forras.id, celTermekId: cel.id, aktiv: true },
        { forrasTermekId: forras.id, celTermekId: nemKozzetett.id, aktiv: true },
        { forrasTermekId: forras.id, celTermekId: idegen.id, aktiv: true },
      ] });
      const ajanlok = await getProductRecommendations(forras.slug);
      expect(ajanlok.map((ajanlo) => ajanlo.slug)).toEqual([cel.slug]);
      expect(await getProductRecommendations(cel.slug)).toEqual([]);
    } finally {
      await prisma.termekAjanlo.deleteMany({ where: { forrasTermekId: forras.id } });
      await prisma.product.deleteMany({ where: { id: { in: [forras.id, cel.id, nemKozzetett.id, idegen.id] } } });
    }
  });
});
