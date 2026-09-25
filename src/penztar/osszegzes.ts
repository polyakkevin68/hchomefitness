export type KosarTetel = { termekId: string; mennyiseg: number };

export type ArTermek = {
  id: string;
  sku: string;
  nev: string;
  marka: string;
  forras: string;
  arHuf: number;
  aktiv: boolean;
  kozzetett: boolean;
  vasarolhato: boolean;
  probaAdat: boolean;
};

export type SzallitasiMod = "hazhoz" | "emeletre";

export type Osszegzes = {
  tetelek: Array<{ termekId: string; cikkszam: string; nev: string; mennyiseg: number; egysegarHuf: number; sorOsszegHuf: number }>;
  termekOsszegHuf: number;
  szallitasHuf: number | null;
  fizetendoHuf: number | null;
  szallitasiMod: SzallitasiMod | null;
};

export class KosarHiba extends Error {
  constructor(message: string, readonly kod: "HIBAS_TETEL" | "NEM_VASAROLHATO" | "HIBA_AR" | "TUL_NAGY_OSSZEG" | "FORRAS_ADAT_ELAVULT") {
    super(message);
    this.name = "KosarHiba";
  }
}

const MAX_MENNYISEG = 10;
const MAX_HUF = Number.MAX_SAFE_INTEGER;

function addSafe(a: number, b: number): number {
  const sum = a + b;
  if (!Number.isSafeInteger(sum) || sum > MAX_HUF) throw new KosarHiba("A kosár összege túl nagy.", "TUL_NAGY_OSSZEG");
  return sum;
}

/** Az ár kizárólag az adatbázisból betöltött termékből származhat. */
export function osszesitKosarat(
  tetelLista: KosarTetel[],
  termekek: ArTermek[],
  szallitasiMod: SzallitasiMod | null,
  emeletDijHuf = 19_900,
): Osszegzes {
  if (!Array.isArray(tetelLista) || tetelLista.length < 1 || tetelLista.length > 50) {
    throw new KosarHiba("A kosár üres vagy túl sok tételt tartalmaz.", "HIBAS_TETEL");
  }
  if (!Number.isSafeInteger(emeletDijHuf) || emeletDijHuf < 0) throw new KosarHiba("A szállítási díj beállítása hibás.", "HIBA_AR");

  const ids = new Set<string>();
  const arMap = new Map(termekek.map((termek) => [termek.id, termek]));
  let termekOsszegHuf = 0;
  const tetelek = tetelLista.map((tetel) => {
    if (!tetel || typeof tetel.termekId !== "string" || !tetel.termekId || ids.has(tetel.termekId)
      || !Number.isSafeInteger(tetel.mennyiseg) || tetel.mennyiseg < 1 || tetel.mennyiseg > MAX_MENNYISEG) {
      throw new KosarHiba("A kosár egyik tétele vagy mennyisége hibás.", "HIBAS_TETEL");
    }
    ids.add(tetel.termekId);
    const termek = arMap.get(tetel.termekId);
    if (!termek || termek.marka !== "HC Home Fitness" || termek.forras !== "unas" || termek.probaAdat
      || !termek.aktiv || !termek.kozzetett || !termek.vasarolhato) {
      throw new KosarHiba("A kosár tartalmaz nem közzétett vagy nem vásárolható terméket.", "NEM_VASAROLHATO");
    }
    if (!Number.isSafeInteger(termek.arHuf) || termek.arHuf < 0) throw new KosarHiba("A termék ára nem használható.", "HIBA_AR");
    let sorOsszegHuf = 0;
    for (let i = 0; i < tetel.mennyiseg; i += 1) sorOsszegHuf = addSafe(sorOsszegHuf, termek.arHuf);
    termekOsszegHuf = addSafe(termekOsszegHuf, sorOsszegHuf);
    return { termekId: termek.id, cikkszam: termek.sku, nev: termek.nev, mennyiseg: tetel.mennyiseg, egysegarHuf: termek.arHuf, sorOsszegHuf };
  });

  if (szallitasiMod !== null && szallitasiMod !== "hazhoz" && szallitasiMod !== "emeletre") {
    throw new KosarHiba("Ismeretlen szállítási mód.", "HIBAS_TETEL");
  }
  const szallitasHuf = szallitasiMod === "hazhoz" ? 0 : szallitasiMod === "emeletre" ? emeletDijHuf : null;
  return {
    tetelek,
    termekOsszegHuf,
    szallitasHuf,
    fizetendoHuf: szallitasHuf === null ? null : addSafe(termekOsszegHuf, szallitasHuf),
    szallitasiMod,
  };
}
