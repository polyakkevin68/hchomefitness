import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import type { CatalogProduct } from "./adatmodellek";
import { importProducts, UNAS_TELJES_IMPORT_CRON } from "./termek-import";

const product = (sourceId: string, sku = `HC-${sourceId}`): CatalogProduct => ({
  sourceId,
  sku,
  slug: `hc-termek-${sourceId}`,
  name: `HC termék ${sourceId}`,
  brand: "HC Home Fitness",
  category: "Kardiógépek",
  priceHuf: 100_000,
  description: "Fejlesztői adat",
  imageUrls: [],
  attributes: [],
  isPurchasable: true,
  source: "unas",
  isTestFixture: false,
});

function memoryDatabase() {
  const products = new Map<string, Record<string, unknown>>();
  const runs: Record<string, unknown>[] = [];
  let nextId = 1;
  const tx = {
    $queryRaw: async () => [{ pg_advisory_xact_lock: null }],
    product: {
      findUnique: async ({ where }: { where: { source_sourceId: { source: string; sourceId: string } } }) => {
        return products.get(`${where.source_sourceId.source}:${where.source_sourceId.sourceId}`) ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const item: Record<string, unknown> = { ...data, id: `p${nextId++}`, isActive: true };
        products.set(`${item.source}:${item.sourceId}`, item);
        return item;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const pair = [...products.entries()].find(([, item]) => item.id === where.id);
        if (!pair) throw new Error("Ismeretlen termék");
        const item: Record<string, unknown> = { ...pair[1], ...data };
        products.set(pair[0], item);
        return item;
      },
      updateMany: async ({ where, data }: { where: { source: string; isActive: boolean; sourceId?: { notIn: string[] } }; data: Record<string, unknown> }) => {
        let count = 0;
        for (const [key, item] of products) {
          if (item.source !== where.source || item.isActive !== where.isActive || where.sourceId?.notIn.includes(String(item.sourceId))) continue;
          products.set(key, { ...item, ...data });
          count += 1;
        }
        return { count };
      },
    },
    importRun: { create: async ({ data }: { data: Record<string, unknown> }) => { runs.push(data); return data; } },
  };
  const prisma = { $transaction: async <T>(operation: (client: typeof tx) => Promise<T>) => operation(tx) } as unknown as PrismaClient;
  return { prisma, products, runs };
}

describe("ismételhető termékimport", () => {
  it("óránként automatikus teljes forrásfrissítést ütemez", () => {
    expect(UNAS_TELJES_IMPORT_CRON).toBe("30 * * * *");
  });

  it("azonos forrásadatot újrafuttatva nem hoz létre duplikátumot, a közzétételt megőrzi", async () => {
    const db = memoryDatabase();
    const item = product("101");
    const first = await importProducts(db.prisma, { source: "unas", products: [item], fetchComplete: true });
    const row = db.products.get("unas:101")!;
    row.isPublished = true;
    const second = await importProducts(db.prisma, { source: "unas", products: [item], fetchComplete: true });
    expect(first.createdCount).toBe(1);
    expect(second).toMatchObject({ createdCount: 0, updatedCount: 0, unchangedCount: 1, complete: true });
    expect(db.products.size).toBe(1);
    expect(db.products.get("unas:101")?.isPublished).toBe(true);
  });

  it("részleges vagy üres pillanatképnél nem kapcsol ki korábbi terméket", async () => {
    const db = memoryDatabase();
    await importProducts(db.prisma, { source: "unas", products: [product("101"), product("102")], fetchComplete: true });
    const partial = await importProducts(db.prisma, { source: "unas", products: [product("101")], invalidCount: 1, fetchComplete: true });
    const empty = await importProducts(db.prisma, { source: "unas", products: [], fetchComplete: true });
    expect(partial.deactivatedCount).toBe(0);
    expect(empty.deactivatedCount).toBe(0);
    expect(db.products.get("unas:102")?.isActive).toBe(true);
  });

  it("teljes képnél a bizonyítottan más márkájú terméket kikapcsolja", async () => {
    const db = memoryDatabase();
    await importProducts(db.prisma, { source: "unas", products: [product("101"), product("102")], fetchComplete: true });
    const result = await importProducts(db.prisma, { source: "unas", products: [product("101")], excludedSourceIds: ["102"], excludedCount: 1, fetchComplete: true });
    expect(result.deactivatedCount).toBe(1);
    expect(db.products.get("unas:102")?.isActive).toBe(false);
  });
});
