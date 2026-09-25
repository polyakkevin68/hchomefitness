import type { CatalogProduct } from "./adatmodellek";

export const OSSZEHASONLITAS_MINIMUM = 2;
export const OSSZEHASONLITAS_MAXIMUM = 4;

export type Termekkereso = (slug: string) => Promise<CatalogProduct | null>;
export type TermekOsszehasonlitas = { termekek: CatalogProduct[]; hiba?: string };

const slugMinta = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function betoltOsszehasonlitas(
  bemenet: string[],
  termeketKeres: Termekkereso,
): Promise<TermekOsszehasonlitas> {
  if (bemenet.length < OSSZEHASONLITAS_MINIMUM || bemenet.length > OSSZEHASONLITAS_MAXIMUM) {
    return { termekek: [], hiba: "Válassz 2–4 terméket az összehasonlításhoz." };
  }

  const slugok = bemenet.map((slug) => slug.trim());
  if (slugok.some((slug) => slug.length > 160 || !slugMinta.test(slug))) {
    return { termekek: [], hiba: "A termékválasztás érvénytelen." };
  }
  if (new Set(slugok).size !== slugok.length) {
    return { termekek: [], hiba: "Ugyanaz a termék csak egyszer választható." };
  }

  const talalatok = await Promise.all(slugok.map((slug) => termeketKeres(slug)));
  if (talalatok.some((termek) => !termek
    || termek.brand !== "HC Home Fitness"
    || termek.source !== "unas"
    || termek.isTestFixture)) {
    return { termekek: [], hiba: "A választott termékek között nem elérhető HC termék van." };
  }

  const termekek = talalatok as CatalogProduct[];
  if (new Set(termekek.map((termek) => termek.category)).size !== 1) {
    return { termekek: [], hiba: "Csak azonos kategóriájú termékek hasonlíthatók össze." };
  }

  return { termekek };
}
