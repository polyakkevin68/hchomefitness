import { describe, expect, it } from "vitest";
import { keszletInformacio, keszletUzenet } from "./keszlet-allapot";

describe("készletpillanatkép állapota", () => {
  const most = new Date("2026-09-24T12:00:00.000Z");

  it("frissnek jelöli a korhatáron belüli, egyértelmű készletet", () => {
    expect(keszletInformacio({ quantity: 3, fetchedAt: new Date(most.getTime() - 60_000) }, 7200, most))
      .toEqual({ allapot: "friss", mennyiseg: 3 });
  });

  it("elavultként jelöli a korhatárt elérő készletet", () => {
    expect(keszletInformacio({ quantity: 3, fetchedAt: new Date(most.getTime() - 7200_000) }, 7200, most))
      .toEqual({ allapot: "elavult" });
  });

  it("ismeretlenként kezeli a hiányzó pillanatképet és az ismeretlen mennyiséget", () => {
    expect(keszletInformacio(null, 7200, most)).toEqual({ allapot: "ismeretlen" });
    expect(keszletInformacio({ quantity: null, fetchedAt: new Date(most.getTime() - 1000) }, 7200, most))
      .toEqual({ allapot: "ismeretlen" });
  });

  it("nem tesz friss állítást hibás vagy jövőbeli időbélyegre", () => {
    expect(keszletInformacio({ quantity: 2, fetchedAt: new Date(Number.NaN) }, 7200, most))
      .toEqual({ allapot: "ismeretlen" });
    expect(keszletInformacio({ quantity: 2, fetchedAt: new Date(most.getTime() + 1) }, 7200, most))
      .toEqual({ allapot: "ismeretlen" });
  });

  it("nem minősít frissnek nem pozitív korhatár mellett", () => {
    expect(keszletInformacio({ quantity: 2, fetchedAt: new Date(most.getTime() - 1) }, 0, most))
      .toEqual({ allapot: "ismeretlen" });
  });

  it("a vásárlónak nem ígér garantált készletet", () => {
    expect(keszletUzenet({ allapot: "friss", mennyiseg: 3 })).toContain("külön visszaigazoljuk");
    expect(keszletUzenet({ allapot: "elavult" })).toContain("frissítése szükséges");
    expect(keszletUzenet({ allapot: "ismeretlen" })).toContain("nem ismert");
  });
});
