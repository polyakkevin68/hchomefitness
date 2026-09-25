import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/adatbazis-kapcsolat";
import type { PrismaClient } from "../generated/prisma/client";
import type { UnasStockSnapshot } from "./unas-forras";
import { UNAS_KESZLET_SZINKRON_CRON, szinkronizalUnasKeszletet } from "./keszlet-szinkron";

describe("UNAS készletszinkron", () => {
  it("óránként frissül, így az 50 SKU-s csomagok híváskorlátja alatt marad", () => {
    expect(UNAS_KESZLET_SZINKRON_CRON).toBe("0 * * * *");
  });

  it("csak egyértelmű, közös terméksort tesz számmá; összetett vagy hiányzó adat ismeretlen marad", async () => {
    const termekek = [
      { id: "p1", sku: "A" },
      { id: "p2", sku: "B" },
      { id: "p3", sku: "C" },
    ];
    const mentett: Array<Record<string, unknown>> = [];
    const upsert = vi.fn(async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
      mentett.push(args.create);
      return args.create;
    });
const prisma = {
      product: { findMany: vi.fn(async () => termekek) },
      $transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) => operation({ productStock: { upsert } })),
} as unknown as PrismaClient;
    const getStocksBySku = vi.fn(async (skus: string[]): Promise<UnasStockSnapshot> => ({
      fetchedAt: new Date("2026-09-24T10:00:00.000Z"),
      stocks: [
        { id: "101", sku: "A", quantity: 4, variants: [] },
        { id: "102", sku: "B", quantity: 2, variants: ["XL"] },
      ].filter((row) => skus.includes(row.sku)),
      unreturnedSkus: ["C"].filter((sku) => skus.includes(sku)),
    }));

    const result = await szinkronizalUnasKeszletet(prisma, getStocksBySku);

    expect(result).toEqual({ updatedCount: 3, knownCount: 1, unknownCount: 2 });
    expect(getStocksBySku).toHaveBeenCalledWith(["A", "B", "C"]);
    expect(mentett.map((row) => row.quantity)).toEqual([4, null, null]);
    expect(mentett.map((row) => row.fetchedAt)).toEqual(Array(3).fill(new Date("2026-09-24T10:00:00.000Z")));
    expect(mentett[1].rows).toEqual([{ quantity: 2, variants: ["XL"], warehouseId: null, active: null }]);
    expect(mentett[2].rows).toEqual([]);
  });

  it("50 cikkszámnál darabol, és bármelyik forráskérés hibájánál nem ment részleges készletet", async () => {
    const termekek = Array.from({ length: 51 }, (_value, index) => ({ id: `p${index}`, sku: `SKU-${index}` }));
    const upsert = vi.fn();
    const prisma = {
      product: { findMany: vi.fn(async () => termekek) },
      $transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) => operation({ productStock: { upsert } })),
    } as unknown as PrismaClient;
    let callIndex = 0;
    const getStocksBySku = vi.fn(async (skus: string[]): Promise<UnasStockSnapshot> => {
      callIndex += 1;
      if (callIndex === 1) return { fetchedAt: new Date(), stocks: [], unreturnedSkus: skus };
      throw new Error("UNAS időtúllépés");
    });

    await expect(szinkronizalUnasKeszletet(prisma, getStocksBySku)).rejects.toThrow("UNAS időtúllépés");
    expect(getStocksBySku).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });
});

const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const engedelyezettAdatbazis = dbUrl !== null
  && ["localhost", "127.0.0.1", "::1"].includes(dbUrl.hostname)
  && dbUrl.pathname === "/hc_webaruhaz";

describe.skipIf(!engedelyezettAdatbazis)("UNAS készletszinkron helyi PostgreSQL-adatbázissal", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("elmenti az UNAS pillanatképet, majd az ismeretlenné vált mennyiséget nullára frissíti", async () => {
    const token = randomBytes(12).toString("hex");
    const termek = await prisma.product.create({ data: {
      source: "unas",
      sourceId: `keszlet-proba-${token}`,
      sku: `HC-STOCK-${token}`,
      slug: `keszlet-proba-${token}`,
      name: "Készletszinkron integrációs termék",
      brand: "HC Home Fitness",
      category: "Teszt",
      priceHuf: 120_000,
      isTestFixture: false,
      isActive: true,
      isPurchasable: true,
    } });

    try {
      const getKnownStock = vi.fn(async (skus: string[]): Promise<UnasStockSnapshot> => ({
        fetchedAt: new Date("2026-09-24T10:00:00.000Z"),
        stocks: [{ id: "unas-1", sku: termek.sku, quantity: 3, variants: [] }].filter((row) => skus.includes(row.sku)),
        unreturnedSkus: [],
      }));
      expect(await szinkronizalUnasKeszletet(prisma, getKnownStock, { skus: [termek.sku] })).toEqual({ updatedCount: 1, knownCount: 1, unknownCount: 0 });
      expect(await prisma.productStock.findUnique({ where: { productId: termek.id } })).toMatchObject({ quantity: 3, fetchedAt: new Date("2026-09-24T10:00:00.000Z") });

      const getUnknownStock = vi.fn(async (skus: string[]): Promise<UnasStockSnapshot> => ({
        fetchedAt: new Date("2026-09-24T11:00:00.000Z"),
        stocks: [],
        unreturnedSkus: skus,
      }));
      expect(await szinkronizalUnasKeszletet(prisma, getUnknownStock, { skus: [termek.sku] })).toEqual({ updatedCount: 1, knownCount: 0, unknownCount: 1 });
      expect(await prisma.productStock.findUnique({ where: { productId: termek.id } })).toMatchObject({ quantity: null, rows: [], fetchedAt: new Date("2026-09-24T11:00:00.000Z") });
    } finally {
      await prisma.product.delete({ where: { id: termek.id } });
      expect(await prisma.productStock.findUnique({ where: { productId: termek.id } })).toBeNull();
    }
  }, 30_000);
});
