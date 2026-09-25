import { describe, expect, it } from "vitest";
import { keszitArukeresoFeed, keszitGoogleFeed } from "./termekfeed";
import type { CatalogProduct } from "./adatmodellek";

function termek(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    sourceId: "unas-1", sku: "HC-1", slug: "futo-pad", name: "Futópad & kiegészítő", brand: "HC Home Fitness",
    category: "Futópadok", priceHuf: 123456, description: "Valódi termék <leírás>", imageUrls: ["https://futopadoutlet.hu/kep.jpg"],
    attributes: [], isPurchasable: true, source: "unas", isTestFixture: false, netPriceHuf: 97288.19, keszlet: { allapot: "friss", mennyiseg: 3 }, ...overrides,
  };
}

describe("valós termékfeedek", () => {
  it("a Google feedbe a friss és rendelhető valós terméket teszi, XML-ben kódolva", () => {
    const feed = keszitGoogleFeed([
      termek(), termek({ sku: "HC-2", keszlet: { allapot: "elavult" } }),
      termek({ sku: "HC-3", source: "fixture", isTestFixture: true }),
      termek({ sku: "HC-4", isPurchasable: false }), termek({ sku: "HC-5", keszlet: { allapot: "friss", mennyiseg: 0 } }),
    ], "https://bolt.example");
    expect(feed).toContain("<g:price>123456.00 HUF</g:price>");
    expect(feed).toContain("Futópad &amp; kiegészítő");
    expect(feed).toContain("https://bolt.example/termek/futo-pad");
    expect((feed.match(/<g:id>/g) ?? [])).toHaveLength(1);
  });

  it("az Árukereső feed stabil azonosítót, bruttó árat és azonos termékoldal-URL-t ad", () => {
    const feed = keszitArukeresoFeed([termek()], "https://bolt.example/");
    expect(feed).toContain("<identifier>HC-1</identifier>");
    expect(feed).toContain("<price>123456</price>");
    expect(feed).toContain("<net_price>97288.19</net_price>");
    expect(feed).toContain("<product_url>https://bolt.example/termek/futo-pad</product_url>");
    expect(feed).toContain("<image_url>https://futopadoutlet.hu/kep.jpg</image_url>");
  });

  it("HTTPS alap URL-t követel meg", () => {
    expect(() => keszitGoogleFeed([termek()], "http://bolt.example")).toThrow(/HTTPS/);
  });

  it("nettó forrásár nélkül kihagyja az Árukereső tételt, nem becsüli az áfát", () => {
    expect(keszitArukeresoFeed([termek({ netPriceHuf: undefined })], "https://bolt.example")).not.toContain("<product>");
  });
});
