import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "./adatmodellek";
import { filterCatalog } from "./katalogus-szures";

const products: CatalogProduct[] = [
  { sourceId: "1", sku: "HC-1", slug: "futo", name: "Futópad", brand: "HC Home Fitness", category: "Futópadok", priceHuf: 200_000, description: "Összecsukható", imageUrls: [], attributes: [], isPurchasable: true, source: "fixture", isTestFixture: true },
  { sourceId: "2", sku: "HC-2", slug: "bicikli", name: "Szobabicikli", brand: "HC Home Fitness", category: "Szobakerékpárok", priceHuf: 100_000, description: "Csendes", imageUrls: [], attributes: [], isPurchasable: true, source: "fixture", isTestFixture: true },
  { sourceId: "3", sku: "HC-3", slug: "futo-pro", name: "Futópad Pro", brand: "HC Home Fitness", category: "Futópadok", priceHuf: 300_000, description: "Erős motor", imageUrls: [], attributes: [], isPurchasable: true, source: "fixture", isTestFixture: true },
];

describe("katalógus keresés és szűrés", () => {
  it("a keresést és a kategóriát együtt alkalmazza", () => {
    expect(filterCatalog(products, { keres: "FUTÓ", kategoria: "Futópadok" }).map((item) => item.sku)).toEqual(["HC-1", "HC-3"]);
    expect(filterCatalog(products, { keres: "csendes" }).map((item) => item.sku)).toEqual(["HC-2"]);
    expect(filterCatalog(products, { keres: "HC-2" }).map((item) => item.sku)).toEqual(["HC-2"]);
  });

  it("ár és név szerint rendezi a találatokat", () => {
    expect(filterCatalog(products, { rendezes: "ar-novekvo" }).map((item) => item.sku)).toEqual(["HC-2", "HC-1", "HC-3"]);
    expect(filterCatalog(products, { rendezes: "nev" }).map((item) => item.name)).toEqual(["Futópad", "Futópad Pro", "Szobabicikli"]);
  });
});
