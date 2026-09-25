import { describe, expect, it } from "vitest";
import { katalogusKategoriak, katalogusKategoria, rendezettKatalogusKategoriak } from "./katalogus-kategoriak";

describe("engedélyezett katalóguskategóriák", () => {
  it("csak a kért kilenc kategóriát tartja meg a megadott sorrendben", () => {
    expect(katalogusKategoriak).toEqual([
      "Elliptikus trénerek",
      "Evezőpadok",
      "Futópadok",
      "Masszázsfotelek",
      "Szobakerékpárok",
      "Padok, haspadok, súlyzópadok",
      "Rudak",
      "Súlytárcsák",
      "Több funkciós edzőgépek",
    ]);
  });

  it("az UNAS alcsoportokat a megadott gyűjtőkategóriába rendezi", () => {
    expect(katalogusKategoria("Elliptikus trénerek|Fronthajtásos elliptikus trénerek")).toBe("Elliptikus trénerek");
    expect(katalogusKategoria("Kombinált edzőgépek, sporteszközök, egyéb|Többfunkciós edző gépek")).toBe("Több funkciós edzőgépek");
    expect(katalogusKategoria("Masszázsfotel")).toBe("Masszázsfotelek");
    expect(katalogusKategoria("Szobakerékpár")).toBe("Szobakerékpárok");
  });

  it("a nem kért kategóriát kizárja és a látható kategóriákat sorrendbe teszi", () => {
    expect(katalogusKategoria("Erőgépek")).toBeNull();
    expect(rendezettKatalogusKategoriak(["Rudak", "Erőgépek", "Futópadok"])).toEqual(["Futópadok", "Rudak"]);
  });
});
