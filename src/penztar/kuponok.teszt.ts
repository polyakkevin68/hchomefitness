import { describe, expect, it } from "vitest";
import { szamolKuponkedvezmenyt, type KuponSzabaly } from "./kuponok";

const most = new Date("2026-09-25T12:00:00Z");
function kupon(feluliras: Partial<KuponSzabaly> = {}): KuponSzabaly {
  return { kod: "HC10", tipus: "SZAZALEK", ertek: 10, minimumHuf: 50_000, maximumHuf: 40_000, kezdet: new Date("2026-09-01T00:00:00Z"), veg: new Date("2026-10-01T00:00:00Z"), felhasznalasiKeret: 10, felhasznalt: 0, aktiv: true, osszevonhato: false, kategoriak: ["Futópadok"], cikkszamok: [], ...feluliras };
}
const tetelek = [{ cikkszam: "HC-FUTO-1", kategoria: "Futópadok", sorOsszegHuf: 100_000 }, { cikkszam: "HC-BIC-1", kategoria: "Szobakerékpárok", sorOsszegHuf: 80_000 }];

describe("kuponkedvezmény szabályai", () => {
  it("csak a kijelölt termékkörre számol, és a maximumot betartja", () => {
    expect(szamolKuponkedvezmenyt(kupon({ maximumHuf: 5_000 }), tetelek, most)).toEqual({ ervenyes: true, kedvezmenyHuf: 5_000 });
  });

  it("a minimumkosár a teljes termékösszegre, a kedvezmény csak jogosult tételekre vonatkozik", () => {
    expect(szamolKuponkedvezmenyt(kupon({ maximumHuf: null }), tetelek, most)).toEqual({ ervenyes: true, kedvezmenyHuf: 10_000 });
    expect(szamolKuponkedvezmenyt(kupon({ minimumHuf: 200_001 }), tetelek, most).ervenyes).toBe(false);
  });

  it("fix összegű kedvezménynél sem enged negatív végösszeget", () => {
    expect(szamolKuponkedvezmenyt(kupon({ tipus: "OSSZEG", ertek: 500_000, maximumHuf: null }), tetelek, most)).toEqual({ ervenyes: true, kedvezmenyHuf: 100_000 });
  });

  it("elutasítja az időn kívüli, kikapcsolt és kimerült kupont", () => {
    expect(szamolKuponkedvezmenyt(kupon({ kezdet: new Date("2026-09-25T12:00:01Z") }), tetelek, most).ervenyes).toBe(false);
    expect(szamolKuponkedvezmenyt(kupon({ veg: most }), tetelek, most).ervenyes).toBe(false);
    expect(szamolKuponkedvezmenyt(kupon({ aktiv: false }), tetelek, most).ervenyes).toBe(false);
    expect(szamolKuponkedvezmenyt(kupon({ felhasznalt: 10 }), tetelek, most).ervenyes).toBe(false);
  });

  it("összevonhatóság nélkül nem kombinál más kedvezménnyel", () => {
    expect(szamolKuponkedvezmenyt(kupon(), tetelek, most, true).ervenyes).toBe(false);
    expect(szamolKuponkedvezmenyt(kupon({ osszevonhato: true }), tetelek, most, true).ervenyes).toBe(true);
  });

  it("ismeretlen termékkörnél nem ad kedvezményt", () => {
    expect(szamolKuponkedvezmenyt(kupon({ kategoriak: [], cikkszamok: ["MÁS"] }), tetelek, most).kedvezmenyHuf).toBe(0);
  });
});
