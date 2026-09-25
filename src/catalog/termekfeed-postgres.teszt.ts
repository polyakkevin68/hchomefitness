import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { getProductBySlug } from "./katalogus";
import { keszitArukeresoFeed, keszitGoogleFeed } from "./termekfeed";

describe("termékfeed és termékoldali ár/készlet PostgreSQL-en", () => {
  const id = randomUUID().replaceAll("-", "").slice(0, 18);
  const slug = `m9-feed-${id}`;
  let productId = "";
  beforeAll(() => {
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("CATALOG_ADAPTER", "unas");
    vi.stubEnv("STOCK_MAX_AGE_SECONDS", "7200");
  });
  afterAll(async () => {
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.$disconnect();
  });

  it("mindkét feed a termékoldal azonos forrásárát használja és csak friss, publikált terméket ad", async () => {
    const now = new Date();
    const product = await prisma.product.create({ data: {
      source: "unas", sourceId: `feed-${id}`, sku: `HC-FEED-${id}`, slug, name: "Feed-próbatermék",
      brand: "HC Home Fitness", category: "Futópadok", description: "Integrációs ellenőrzés", imageUrls: ["https://futopadoutlet.hu/feed.jpg"],
      attributes: [], isPurchasable: true, priceHuf: 123456, netPriceHuf: 97288.19, isPublished: true, isTestFixture: false, isActive: true,
      lastImportedAt: now, keszlet: { create: { quantity: 3, fetchedAt: now } },
    } });
    productId = product.id;
    const page = await getProductBySlug(slug);
    expect(page?.priceHuf).toBe(product.priceHuf);
    expect(page?.netPriceHuf).toBe(97288.19);
    expect(page?.keszlet).toEqual({ allapot: "friss", mennyiseg: 3 });
    const google = keszitGoogleFeed(page ? [page] : [], "https://bolt.example");
    const arukereso = keszitArukeresoFeed(page ? [page] : [], "https://bolt.example");
    expect(google).toContain("<g:price>123456.00 HUF</g:price>");
    expect(arukereso).toContain("<price>123456</price>");
    expect(arukereso).toContain("<net_price>97288.19</net_price>");
    expect(google).toContain(`<g:id>${product.sku}</g:id>`);
    expect(arukereso).toContain(`<identifier>${product.sku}</identifier>`);
  });
});
