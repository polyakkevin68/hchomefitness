export const KATALOGUS_OLDALMERET = 12;

export type KatalogusOldalLapozas = {
  oldal: number;
  oldalakSzama: number;
  kihagyas: number;
};

export function normalizalKatalogusOldalt(
  kertOldal: string | undefined,
  termekekSzama: number,
  oldalmeret = KATALOGUS_OLDALMERET,
): KatalogusOldalLapozas {
  if (!Number.isSafeInteger(termekekSzama) || termekekSzama < 0) throw new Error("A termékszám nem lehet negatív vagy hibás.");
  if (!Number.isSafeInteger(oldalmeret) || oldalmeret < 1) throw new Error("Az oldalméret pozitív egész legyen.");

  const oldalakSzama = Math.max(1, Math.ceil(termekekSzama / oldalmeret));
  const kertSzam = kertOldal && /^\d+$/.test(kertOldal) ? Number(kertOldal) : 1;
  const oldal = Math.min(oldalakSzama, Math.max(1, Number.isSafeInteger(kertSzam) ? kertSzam : 1));
  return { oldal, oldalakSzama, kihagyas: (oldal - 1) * oldalmeret };
}
