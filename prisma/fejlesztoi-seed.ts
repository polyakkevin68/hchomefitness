import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { importProducts } from "../src/catalog/termek-import";

if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
  throw new Error("A fejlesztői seed production környezetben tiltott.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL szükséges a fejlesztői seedhez.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const fixtures = [
  ["HC-DEV-FUTO-01", "fejlesztoi-futopad-minta", "Futópad – fejlesztői minta", "Futópadok", 299990],
  ["HC-DEV-BIC-01", "fejlesztoi-szobabicikli-minta", "Szobabicikli – fejlesztői minta", "Szobakerékpárok", 149990],
  ["HC-DEV-ELL-01", "fejlesztoi-ellipszis-minta", "Ellipszis tréner – fejlesztői minta", "Ellipszis trénerek", 219990],
  ["HC-DEV-EVE-01", "fejlesztoi-evezogep-minta", "Evezőgép – fejlesztői minta", "Evezőgépek", 189990],
  ["HC-DEV-EROS-01", "fejlesztoi-eropad-minta", "Erőpad – fejlesztői minta", "Erőgépek", 99990],
  ["HC-DEV-KEZI-01", "fejlesztoi-kezisulyzo-minta", "Kézisúlyzó szett – fejlesztői minta", "Súlyzók", 39990],
  ["HC-DEV-STEP-01", "fejlesztoi-stepper-minta", "Mini stepper – fejlesztői minta", "Kardiógépek", 44990],
  ["HC-DEV-VIB-01", "fejlesztoi-vibracios-minta", "Vibrációs tréner – fejlesztői minta", "Kardiógépek", 119990],
  ["HC-DEV-TRAMP-01", "fejlesztoi-trambulin-minta", "Fitnesztrambulin – fejlesztői minta", "Kiegészítők", 29990],
  ["HC-DEV-MASSZ-01", "fejlesztoi-masszirozo-minta", "Masszírozó henger – fejlesztői minta", "Kiegészítők", 12990],
  ["HC-DEV-SZONY-01", "fejlesztoi-szonyeg-minta", "Edzőszőnyeg – fejlesztői minta", "Kiegészítők", 9990],
  ["HC-DEV-KABEL-01", "fejlesztoi-kabel-minta", "Edzőkábel – fejlesztői minta", "Kiegészítők", 7990],
] as const;

async function runSeed(): Promise<void> {
  try {
    const products = fixtures.map(([sku, slug, name, category, priceHuf]) => ({
      sourceId: sku,
      sku,
      slug,
      name,
      brand: "HC Home Fitness",
      category,
      priceHuf,
      description: "Kizárólag fejlesztői próbaadat.",
      imageUrls: [],
      attributes: [],
      isPurchasable: true,
      source: "fixture" as const,
      isTestFixture: true,
    }));
    await importProducts(prisma, { source: "fixture", products, fetchComplete: true });
    console.log(`${fixtures.length} fejlesztői próbaadat ismételhetően frissítve.`);
  } finally {
    await prisma.$disconnect();
  }
}

void runSeed().catch(() => {
  console.error("A fejlesztői seed nem futott le.");
  process.exitCode = 1;
});
