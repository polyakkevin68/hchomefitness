export type KuponSzabaly = {
  kod: string;
  tipus: "SZAZALEK" | "OSSZEG";
  ertek: number;
  minimumHuf: number;
  maximumHuf: number | null;
  kezdet: Date;
  veg: Date;
  felhasznalasiKeret: number | null;
  felhasznalt: number;
  aktiv: boolean;
  osszevonhato: boolean;
  kategoriak: string[];
  cikkszamok: string[];
};

export type KuponTetel = { cikkszam: string; kategoria: string; sorOsszegHuf: number };
export type KuponEredmeny = { ervenyes: true; kedvezmenyHuf: number } | { ervenyes: false; kedvezmenyHuf: 0; hiba: string };

function sikertelen(hiba: string): KuponEredmeny { return { ervenyes: false, kedvezmenyHuf: 0, hiba }; }

export function szamolKuponkedvezmenyt(kupon: KuponSzabaly, tetelek: KuponTetel[], most = new Date(), masKedvezmenyAktiv = false): KuponEredmeny {
  const termekOsszeg = tetelek.reduce((osszeg, tetel) => osszeg + tetel.sorOsszegHuf, 0);
  if (!kupon.aktiv || !Number.isSafeInteger(kupon.ertek) || kupon.ertek < 1 || kupon.ertek > (kupon.tipus === "SZAZALEK" ? 100 : 99_999_999)) return sikertelen("Ez a kupon nem használható.");
  if (most < kupon.kezdet || most >= kupon.veg) return sikertelen("A kupon nem aktív ebben az időszakban.");
  if (kupon.felhasznalasiKeret !== null && kupon.felhasznalt >= kupon.felhasznalasiKeret) return sikertelen("A kupon felhasználási kerete betelt.");
  if (masKedvezmenyAktiv && !kupon.osszevonhato) return sikertelen("Ez a kupon más kedvezménnyel nem vonható össze.");
  if (termekOsszeg < kupon.minimumHuf) return sikertelen("A kosár nem éri el a kupon minimumösszegét.");
  const kategoriak = new Set(kupon.kategoriak);
  const cikkszamok = new Set(kupon.cikkszamok);
  const jogosultTetelek = kategoriak.size === 0 && cikkszamok.size === 0
    ? tetelek
    : tetelek.filter((tetel) => kategoriak.has(tetel.kategoria) || cikkszamok.has(tetel.cikkszam));
  const jogosultOsszeg = jogosultTetelek.reduce((osszeg, tetel) => osszeg + tetel.sorOsszegHuf, 0);
  if (jogosultOsszeg < 1) return sikertelen("A kosárban nincs a kuponhoz tartozó termék.");
  const nyersKedvezmeny = kupon.tipus === "SZAZALEK" ? Math.floor(jogosultOsszeg * kupon.ertek / 100) : kupon.ertek;
  const kedvezmenyHuf = Math.min(jogosultOsszeg, nyersKedvezmeny, kupon.maximumHuf ?? Number.MAX_SAFE_INTEGER);
  if (!Number.isSafeInteger(kedvezmenyHuf) || kedvezmenyHuf < 1) return sikertelen("A kupon nem alkalmazható a kiválasztott termékekre.");
  return { ervenyes: true, kedvezmenyHuf };
}
