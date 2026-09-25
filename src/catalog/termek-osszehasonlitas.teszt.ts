import { describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "./adatmodellek";
import { betoltOsszehasonlitas } from "./termek-osszehasonlitas";

function termek(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    sourceId: "1",
    sku: "HC-1",
    slug: "futopad-1",
    name: "Futópad 1",
    brand: "HC Home Fitness",
    category: "Futópadok",
    priceHuf: 200_000,
    description: "Ellenőrzött termék",
    imageUrls: [],
    attributes: [],
    isPurchasable: true,
    source: "unas",
    isTestFixture: false,
    ...overrides,
  };
}

describe("termék-összehasonlítás", () => {
  it("betölti a 2–4 valódi, azonos kategóriájú HC terméket", async () => {
    const masik = termek({ sourceId: "2", sku: "HC-2", slug: "futopad-2", name: "Futópad 2" });
    const lookup = vi.fn(async (slug: string) => slug === "futopad-2" ? masik : termek());

    const eredmeny = await betoltOsszehasonlitas(["futopad-1", "futopad-2"], lookup);

    expect(eredmeny.hiba).toBeUndefined();
    expect(eredmeny.termekek.map((item) => item.slug)).toEqual(["futopad-1", "futopad-2"]);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("elutasítja a túl kevés, túl sok vagy ismétlődő azonosítót", async () => {
    const lookup = vi.fn(async () => termek());

    expect((await betoltOsszehasonlitas(["futopad-1"], lookup)).hiba).toBeDefined();
    expect((await betoltOsszehasonlitas(["a", "b", "c", "d", "e"], lookup)).hiba).toBeDefined();
    expect((await betoltOsszehasonlitas(["futopad-1", "futopad-1"], lookup)).hiba).toBeDefined();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("elutasítja az érvénytelen slugot és a nem létező terméket", async () => {
    const lookup = vi.fn(async () => null);

    expect((await betoltOsszehasonlitas(["../titok", "masik"], lookup)).hiba).toBeDefined();
    expect((await betoltOsszehasonlitas(["futopad-1", "masik"], lookup)).hiba).toBeDefined();
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("elutasítja az eltérő kategóriát, idegen márkát és fejlesztői mintát", async () => {
    const futopad = termek();
    const lookup = vi.fn(async (slug: string) => {
      if (slug === "bicikli") return termek({ slug, category: "Szobakerékpárok" });
      if (slug === "mas-marka") return termek({ slug, brand: "Más márka" });
      if (slug === "minta") return termek({ slug, source: "fixture", isTestFixture: true });
      return futopad;
    });

    expect((await betoltOsszehasonlitas(["futopad-1", "bicikli"], lookup)).hiba).toBeDefined();
    expect((await betoltOsszehasonlitas(["futopad-1", "mas-marka"], lookup)).hiba).toBeDefined();
    expect((await betoltOsszehasonlitas(["futopad-1", "minta"], lookup)).hiba).toBeDefined();
  });
});
