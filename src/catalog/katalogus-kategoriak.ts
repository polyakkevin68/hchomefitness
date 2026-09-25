export const katalogusKategoriak = [
  "Elliptikus trénerek",
  "Evezőpadok",
  "Futópadok",
  "Masszázsfotelek",
  "Szobakerékpárok",
  "Padok, haspadok, súlyzópadok",
  "Rudak",
  "Súlytárcsák",
  "Több funkciós edzőgépek",
] as const;

export type KatalogusKategoria = (typeof katalogusKategoriak)[number];

const forrasbolKatalogusba: Record<string, KatalogusKategoria> = {
  "Elliptikus trénerek": "Elliptikus trénerek",
  "Elliptikus trénerek|Fronthajtásos elliptikus trénerek": "Elliptikus trénerek",
  "Elliptikus trénerek|Összecsukható elliptikus trénerek": "Elliptikus trénerek",
  "Evezőpadok": "Evezőpadok",
  "Futópadok": "Futópadok",
  "Masszázsfotel": "Masszázsfotelek",
  "Masszázsfotelek": "Masszázsfotelek",
  "Szobakerékpár": "Szobakerékpárok",
  "Szobakerékpárok": "Szobakerékpárok",
  "Kombinált edzőgépek, sporteszközök, egyéb|Padok, haspadok, súlyzópadok": "Padok, haspadok, súlyzópadok",
  "Padok, haspadok, súlyzópadok": "Padok, haspadok, súlyzópadok",
  "Kombinált edzőgépek, sporteszközök, egyéb|Rudak": "Rudak",
  "Rudak": "Rudak",
  "Kombinált edzőgépek, sporteszközök, egyéb|Súlytárcsák": "Súlytárcsák",
  "Súlytárcsák": "Súlytárcsák",
  "Kombinált edzőgépek, sporteszközök, egyéb|Többfunkciós edző gépek": "Több funkciós edzőgépek",
  "Többfunkciós edző gépek": "Több funkciós edzőgépek",
  "Több funkciós edzőgépek": "Több funkciós edzőgépek",
};

export const forrasKategoriak = Object.keys(forrasbolKatalogusba);

export function katalogusKategoria(forrasNev: string): KatalogusKategoria | null {
  return forrasbolKatalogusba[forrasNev] ?? null;
}

export function forrasKategoriakMegjelenitesiNevhez(nev: string): string[] {
  return Object.entries(forrasbolKatalogusba).flatMap(([forras, cel]) => cel === nev ? [forras] : []);
}

export function rendezettKatalogusKategoriak(nevek: string[]): string[] {
  const jelenlevok = new Set(nevek.map(katalogusKategoria).filter((nev): nev is KatalogusKategoria => nev !== null));
  return katalogusKategoriak.filter((nev) => jelenlevok.has(nev));
}
