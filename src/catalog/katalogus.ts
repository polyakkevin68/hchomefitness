import "server-only";
import { fixtureAdapter } from "./proba-adapter";
import type { CatalogAdapter, KatalogusKereso, KatalogusOldal } from "./adatmodellek";
import { filterCatalog } from "./katalogus-szures";
import { normalizalKatalogusOldalt, KATALOGUS_OLDALMERET } from "./katalogus-lapozas";
import { readAppConfig } from "@/lib/kornyezet-beallitas";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { createUnasDatabaseAdapter } from "./unas-adatbazis-adapter";

const unasAdapter = createUnasDatabaseAdapter(prisma);
const unasElozetesAdapter = createUnasDatabaseAdapter(prisma, true);

function getAdapter(): CatalogAdapter {
  const config = readAppConfig();
  if (config.CATALOG_ADAPTER === "fixture" && config.APP_ENV !== "production") return fixtureAdapter;
  if (config.CATALOG_ADAPTER === "unas") return unasAdapter;
  if (config.CATALOG_ADAPTER === "unas-preview" && config.APP_ENV === "development") return unasElozetesAdapter;
  return { async listProducts() { return []; } };
}

export async function listProducts() {
  return getAdapter().listProducts();
}

export async function getProductBySlug(slug: string) {
  const adapter = getAdapter();
  if (adapter.getProductBySlug) return adapter.getProductBySlug(slug);
  return (await adapter.listProducts()).find((termek) => termek.slug === slug) ?? null;
}

export async function getCatalogPage(kereses: KatalogusKereso): Promise<KatalogusOldal> {
  const adapter = getAdapter();
  if (adapter.searchProducts) return adapter.searchProducts(kereses);

  const termekek = await adapter.listProducts();
  const szurtTermekek = filterCatalog(termekek, kereses);
  const oldalmeret = kereses.oldalmeret ?? KATALOGUS_OLDALMERET;
  const lapozas = normalizalKatalogusOldalt(kereses.oldal, szurtTermekek.length, oldalmeret);
  return {
    termekek: szurtTermekek.slice(lapozas.kihagyas, lapozas.kihagyas + oldalmeret),
    szurtTermekekSzama: szurtTermekek.length,
    osszesTermekSzama: termekek.length,
    kategoriak: [...new Set(termekek.map((termek) => termek.category))],
    oldal: lapozas.oldal,
    oldalakSzama: lapozas.oldalakSzama,
  };
}
