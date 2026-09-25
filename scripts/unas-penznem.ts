import "dotenv/config";
import { readAppConfig } from "../src/lib/kornyezet-schema";
import { UnasProductAdapter } from "../src/catalog/unas-forras";

async function main(): Promise<void> {
  const config = readAppConfig();
  if (config.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("Az UNAS pénznemének ellenőrzése production környezetben tiltott.");
  }
  if (!config.UNAS_API_KEY) throw new Error("Az UNAS API-kulcs nincs beállítva.");

  const adapter = new UnasProductAdapter(config.UNAS_API_KEY);
  const currency = await adapter.getShopDefaultCurrency();
  if (!currency) throw new Error("Az UNAS pénznembeállítása nem tartalmaz alapdevizát.");

  console.log(`Az UNAS áruház alapértelmezett devizaneme: ${currency}`);
  if (currency.toUpperCase() !== "HUF") {
    throw new Error("Az UNAS alapértelmezett devizaneme nem HUF; vásárlás nem engedélyezhető.");
  }
  console.log("A HUF pénznem egyezik a webáruház pénznemével.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Az UNAS pénznemének lekérdezése sikertelen.");
  process.exitCode = 1;
});
