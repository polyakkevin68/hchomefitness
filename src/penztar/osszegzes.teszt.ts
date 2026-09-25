import { describe, expect, it } from "vitest";
import { KosarHiba, osszesitKosarat, type ArTermek } from "./osszegzes";

const hc: ArTermek = {
  id: "p1", sku: "ET160I", nev: "HC futópad", marka: "HC Home Fitness", forras: "unas",
  arHuf: 399_990, aktiv: true, kozzetett: true, vasarolhato: true, probaAdat: false,
};

describe("szerveroldali kosár-összesítés", () => {
  it("a termékek adatbázisból kapott HUF árából számol, a házhoz szállítást 0 Ft-tal veszi", () => {
    const result = osszesitKosarat([{ termekId: "p1", mennyiseg: 2 }], [hc], "hazhoz");
    expect(result).toMatchObject({ termekOsszegHuf: 799_980, szallitasHuf: 0, fizetendoHuf: 799_980 });
  });

  it("a kliensár nem része a kosár bemenetének, és a hiányzó szállítási díj miatt nincs fizetendő összeg", () => {
    const result = osszesitKosarat([{ termekId: "p1", mennyiseg: 1 }], [hc], null);
    expect(result).toMatchObject({ termekOsszegHuf: 399_990, szallitasHuf: null, fizetendoHuf: null });
  });

  it("az emeletre szállítás díja címenként egyszer adódik hozzá", () => {
    const result = osszesitKosarat([{ termekId: "p1", mennyiseg: 2 }], [hc], "emeletre");
    expect(result).toMatchObject({ termekOsszegHuf: 799_980, szallitasHuf: 19_900, fizetendoHuf: 819_880 });
  });

  it("vegyes kosárnál is csak egyszer számolja fel az emeletdíjat", () => {
    const masik = { ...hc, id: "p2", sku: "ET200I", arHuf: 100_000 };
    const result = osszesitKosarat([{ termekId: "p1", mennyiseg: 1 }, { termekId: "p2", mennyiseg: 1 }], [hc, masik], "emeletre");
    expect(result).toMatchObject({ termekOsszegHuf: 499_990, szallitasHuf: 19_900, fizetendoHuf: 519_890 });
  });

  it("nem enged nem közzétett vagy idegen márkájú terméket", () => {
    expect(() => osszesitKosarat([{ termekId: "p1", mennyiseg: 1 }], [{ ...hc, kozzetett: false }], "hazhoz"))
      .toThrowError(KosarHiba);
    expect(() => osszesitKosarat([{ termekId: "p1", mennyiseg: 1 }], [{ ...hc, marka: "Más márka" }], "hazhoz"))
      .toThrowError(KosarHiba);
  });

  it("elutasítja a hibás mennyiséget és a duplikált tételt", () => {
    expect(() => osszesitKosarat([{ termekId: "p1", mennyiseg: 11 }], [hc], "hazhoz")).toThrowError(KosarHiba);
    expect(() => osszesitKosarat([{ termekId: "p1", mennyiseg: 1 }, { termekId: "p1", mennyiseg: 1 }], [hc], "hazhoz"))
      .toThrowError(KosarHiba);
  });
});
