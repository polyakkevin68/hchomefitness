import { describe, expect, it } from "vitest";
import {
  ellenorizFizetesiEgyezest,
  ellenorizVisszateritesOsszeget,
  leptetFizetesiAllapotot,
  leptetVisszateritesiAllapotot,
} from "./allapot";

describe("fizetési állapotok", () => {
  it("elfogadja az ismételt és a szolgáltató által igazolt előrehaladó állapotot", () => {
    expect(leptetFizetesiAllapotot("PENDING", "PENDING")).toBe("PENDING");
    expect(leptetFizetesiAllapotot("PENDING", "SUCCEEDED")).toBe("SUCCEEDED");
  });

  it("nem engedi, hogy egy későn érkező függő állapot visszaállítsa a sikeres fizetést", () => {
    expect(() => leptetFizetesiAllapotot("SUCCEEDED", "PENDING")).toThrow();
  });

  it("ismeretlen eredményből egyeztetés után sikerre válthat", () => {
    expect(leptetFizetesiAllapotot("UNKNOWN", "SUCCEEDED")).toBe("SUCCEEDED");
  });

  it("csak azonos rendelési hivatkozást, összeget és pénznemet fogad el", () => {
    const elvart = { merchantRef: "HC-RENDELES-1", osszegHuf: 25_000, penznem: "HUF" };
    expect(ellenorizFizetesiEgyezest(elvart, elvart)).toBe(true);
    expect(ellenorizFizetesiEgyezest(elvart, { ...elvart, osszegHuf: 24_999 })).toBe(false);
    expect(ellenorizFizetesiEgyezest(elvart, { ...elvart, penznem: "EUR" })).toBe(false);
    expect(ellenorizFizetesiEgyezest(elvart, { ...elvart, merchantRef: "masik" })).toBe(false);
    expect(ellenorizFizetesiEgyezest({ ...elvart, osszegHuf: 0 }, elvart)).toBe(false);
  });
});

describe("visszatérítések", () => {
  it("a szolgáltató által igazolt eredményt tárolja, és az ismételt eseményt elfogadja", () => {
    expect(leptetVisszateritesiAllapotot("REQUESTED", "SUCCEEDED")).toBe("SUCCEEDED");
    expect(leptetVisszateritesiAllapotot("SUCCEEDED", "SUCCEEDED")).toBe("SUCCEEDED");
    expect(() => leptetVisszateritesiAllapotot("SUCCEEDED", "REQUESTED")).toThrow();
  });

  it("nem enged nulla, negatív vagy a fizetett összeget túllépő visszatérítést", () => {
    expect(ellenorizVisszateritesOsszeget(25_000, 5_000, 20_000)).toBe(true);
    expect(ellenorizVisszateritesOsszeget(25_000, 5_000, 20_001)).toBe(false);
    expect(ellenorizVisszateritesOsszeget(25_000, 0, 0)).toBe(false);
    expect(ellenorizVisszateritesOsszeget(25_000, -1, 1)).toBe(false);
  });
});
