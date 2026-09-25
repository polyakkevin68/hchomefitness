import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import { createUnasDatabaseAdapter } from "./unas-adatbazis-adapter";
import { forrasKategoriak } from "./katalogus-kategoriak";

describe("UNAS termékek publikus adatbázis-adaptere", () => {
  it("csak aktív, publikált, nem próba HC termékeket kérdez le", async () => {
    const findMany = vi.fn(async () => [{
      sourceId: "183966082", sku: "ET160I", slug: "et160i", name: "HC termék", brand: "HC Home Fitness",
      category: "Futópadok", priceHuf: 1_000_000, description: "Leírás", imageUrls: [], attributes: [], isPurchasable: true,
      source: "unas", isTestFixture: false, keszlet: null,
    }]);
    const prisma = { product: { findMany } } as unknown as PrismaClient;
    const adapter = createUnasDatabaseAdapter(prisma);
    const products = await adapter.listProducts();
    expect(findMany).toHaveBeenCalledWith({
      where: { brand: "HC Home Fitness", isActive: true, isPublished: true, isTestFixture: false, category: { in: forrasKategoriak } },
      include: { keszlet: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    expect(products).toMatchObject([{ sku: "ET160I", source: "unas", isTestFixture: false, keszlet: { allapot: "ismeretlen" } }]);
  });
  it("fejlesztői előnézetben közzététel előtt is lekéri a termékeket", async () => {
    const findMany = vi.fn(async () => []);
    const prisma = { product: { findMany } } as unknown as PrismaClient;
    await createUnasDatabaseAdapter(prisma, true).listProducts();
    expect(findMany).toHaveBeenCalledWith({
      where: { brand: "HC Home Fitness", isActive: true, isTestFixture: false, category: { in: forrasKategoriak } },
      include: { keszlet: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  });

  it("a friss mennyiséget megmutatja, a lejárt mennyiséget elrejti", async () => {
    const now = new Date();
    const findMany = vi.fn(async () => [
      { sourceId: "fresh", sku: "HC-FRESH", slug: "friss", name: "Friss", brand: "HC Home Fitness", category: "Futópadok", priceHuf: 1000, description: "", imageUrls: [], attributes: [], isPurchasable: true, source: "unas", isTestFixture: false, keszlet: { quantity: 4, fetchedAt: now } },
      { sourceId: "stale", sku: "HC-STALE", slug: "lejart", name: "Lejárt", brand: "HC Home Fitness", category: "Futópadok", priceHuf: 1000, description: "", imageUrls: [], attributes: [], isPurchasable: true, source: "unas", isTestFixture: false, keszlet: { quantity: 9, fetchedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) } },
    ]);
    const prisma = { product: { findMany } } as unknown as PrismaClient;
    const products = await createUnasDatabaseAdapter(prisma).listProducts();
    expect(products.map((product) => product.keszlet)).toEqual([
      { allapot: "friss", mennyiseg: 4 },
      { allapot: "elavult" },
    ]);
  });

  it("az adatbázisban szűr, majd legfeljebb 12 rekordot tölt be a kért oldalhoz", async () => {
    const termek = {
      id: "termek-25", sourceId: "25", sku: "HC-25", slug: "hc-25", name: "HC futópad",
      brand: "HC Home Fitness", category: "Futópadok", priceHuf: 100_000, description: "",
      imageUrls: [], attributes: [], isPurchasable: false, source: "unas", isTestFixture: false, keszlet: null,
    };
    const findMany = vi.fn().mockResolvedValueOnce([
      { category: "Futópadok" }, { category: "Erőgépek" },
    ]).mockResolvedValueOnce([termek]).mockResolvedValueOnce([termek]);
    const count = vi.fn().mockResolvedValueOnce(1_000).mockResolvedValueOnce(49);
    const adapter = createUnasDatabaseAdapter({ product: { findMany, count } } as unknown as PrismaClient);

    const oldal = await adapter.searchProducts!({ keres: "futópad", kategoria: "Futópadok", rendezes: "ar-novekvo", oldal: "2" });

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[1][0]).toMatchObject({ skip: 12, take: 12, orderBy: { priceHuf: "asc" } });
    expect(count.mock.calls[1][0].where).toMatchObject({
      brand: "HC Home Fitness", isActive: true, isPublished: true, isTestFixture: false,
      category: { in: ["Futópadok"] }, OR: expect.arrayContaining([{ sku: { contains: "futópad", mode: "insensitive" } }]),
    });
    expect(oldal).toMatchObject({ szurtTermekekSzama: 49, osszesTermekSzama: 1_000, oldal: 2, oldalakSzama: 5, termekek: [{ sku: "HC-25" }] });

    const gyorsitott = await adapter.searchProducts!({ keres: "futópad", kategoria: "Futópadok", rendezes: "ar-novekvo", oldal: "2" });
    expect(gyorsitott).toEqual(oldal);
    expect(findMany).toHaveBeenCalledTimes(2);

    await adapter.searchProducts!({});
    expect(findMany).toHaveBeenCalledTimes(3);
    expect(count).toHaveBeenCalledTimes(2);
  });

  it("a termékoldalhoz csak a kért slugot tölti be", async () => {
    const termek = {
      id: "termek-1", sourceId: "1", sku: "HC-1", slug: "hc-1", name: "HC futópad",
      brand: "HC Home Fitness", category: "Futópadok", priceHuf: 100_000, description: "",
      imageUrls: [], attributes: [], isPurchasable: false, source: "unas", isTestFixture: false, keszlet: null,
    };
    const findFirst = vi.fn().mockResolvedValue(termek);
    const adapter = createUnasDatabaseAdapter({ product: { findFirst } } as unknown as PrismaClient);

    await expect(adapter.getProductBySlug!("hc-1")).resolves.toMatchObject({ sku: "HC-1" });
    expect(findFirst).toHaveBeenCalledWith({
      where: { brand: "HC Home Fitness", isActive: true, isPublished: true, isTestFixture: false, category: { in: forrasKategoriak }, slug: "hc-1" },
      include: { keszlet: true },
    });
  });
});
