import { describe, expect, it } from "vitest";
import { KATALOGUS_OLDALMERET, normalizalKatalogusOldalt } from "./katalogus-lapozas";

describe("katalóguslapozás", () => {
  it("12 termékes oldalakra osztja az 1000 termékes listát", () => {
    expect(KATALOGUS_OLDALMERET).toBe(12);
    expect(normalizalKatalogusOldalt("2", 1_000)).toEqual({ oldal: 2, oldalakSzama: 84, kihagyas: 12 });
  });

  it("hibás és negatív oldalszámot az első oldalra állít", () => {
    expect(normalizalKatalogusOldalt("nincs", 50).oldal).toBe(1);
    expect(normalizalKatalogusOldalt("-3", 50).oldal).toBe(1);
  });

  it("az üres katalógusnál és túl nagy oldalszámnál is biztonságos oldalt ad", () => {
    expect(normalizalKatalogusOldalt("9", 0)).toEqual({ oldal: 1, oldalakSzama: 1, kihagyas: 0 });
    expect(normalizalKatalogusOldalt("999", 25)).toEqual({ oldal: 3, oldalakSzama: 3, kihagyas: 24 });
  });
});
