import "server-only";
import type { CatalogAdapter, CatalogProduct } from "./adatmodellek";

// Kizárólag fejlesztői próbaadatok. Nem forrásból importált, eladható áruk.
const termekek: Omit<CatalogProduct, "sourceId" | "isPurchasable" | "imageUrls" | "attributes">[] = [
  { sku: "HC-DEV-FUTO-01", slug: "fejlesztoi-futopad-minta", name: "Futópad – fejlesztői minta", brand: "HC Home Fitness", category: "Futópadok", priceHuf: 299990, description: "Nem valódi termékadat. A forráskapcsolat elkészültéig csak a felület kipróbálására szolgál.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-BIC-01", slug: "fejlesztoi-szobabicikli-minta", name: "Szobabicikli – fejlesztői minta", brand: "HC Home Fitness", category: "Szobakerékpárok", priceHuf: 149990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-ELL-01", slug: "fejlesztoi-ellipszis-minta", name: "Ellipszis tréner – fejlesztői minta", brand: "HC Home Fitness", category: "Ellipszis trénerek", priceHuf: 219990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-EVE-01", slug: "fejlesztoi-evezogep-minta", name: "Evezőgép – fejlesztői minta", brand: "HC Home Fitness", category: "Evezőgépek", priceHuf: 189990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-EROS-01", slug: "fejlesztoi-eropad-minta", name: "Erőpad – fejlesztői minta", brand: "HC Home Fitness", category: "Erőgépek", priceHuf: 99990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-KEZI-01", slug: "fejlesztoi-kezisulyzo-minta", name: "Kézisúlyzó szett – fejlesztői minta", brand: "HC Home Fitness", category: "Súlyzók", priceHuf: 39990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-STEP-01", slug: "fejlesztoi-stepper-minta", name: "Mini stepper – fejlesztői minta", brand: "HC Home Fitness", category: "Kardiógépek", priceHuf: 44990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-VIB-01", slug: "fejlesztoi-vibracios-minta", name: "Vibrációs tréner – fejlesztői minta", brand: "HC Home Fitness", category: "Kardiógépek", priceHuf: 119990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-TRAMP-01", slug: "fejlesztoi-trambulin-minta", name: "Fitnesztrambulin – fejlesztői minta", brand: "HC Home Fitness", category: "Kiegészítők", priceHuf: 29990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-MASSZ-01", slug: "fejlesztoi-masszirozo-minta", name: "Masszírozó henger – fejlesztői minta", brand: "HC Home Fitness", category: "Kiegészítők", priceHuf: 12990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-SZONY-01", slug: "fejlesztoi-szonyeg-minta", name: "Edzőszőnyeg – fejlesztői minta", brand: "HC Home Fitness", category: "Kiegészítők", priceHuf: 9990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
  { sku: "HC-DEV-KABEL-01", slug: "fejlesztoi-kabel-minta", name: "Edzőkábel – fejlesztői minta", brand: "HC Home Fitness", category: "Kiegészítők", priceHuf: 7990, description: "Nem valódi termékadat. Készlet és szállítás nincs igazolva.", source: "fixture", isTestFixture: true },
];

export const fixtureAdapter: CatalogAdapter = {
  async listProducts() {
    if (process.env.NODE_ENV === "production" || process.env.CATALOG_ADAPTER !== "fixture") {
      return [];
    }
    return termekek.filter((product) => product.isTestFixture && product.sku.startsWith("HC-")).map((product) => ({ ...product, sourceId: product.sku, imageUrls: [], attributes: [], isPurchasable: true }));
  },
};
