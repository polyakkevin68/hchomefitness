import "dotenv/config";
import { readAppConfig } from "../src/lib/kornyezet-schema";
import { UnasProductAdapter } from "../src/catalog/unas-forras";

async function main(): Promise<void> {
  const config = readAppConfig();
  if (config.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("Az import előnézete production környezetben tiltott.");
  }
  if (!config.UNAS_API_KEY || !config.UNAS_HC_ALLOW_PARAM_ID) {
    throw new Error("Az UNAS API-kulcs és az API engedélyezési paraméter azonosítója szükséges a helyi .env fájlban.");
  }

  const adapter = new UnasProductAdapter(config.UNAS_API_KEY, config.UNAS_HC_ALLOW_PARAM_ID);
  // A Premium dokumentált kerete 30 többtermékes getProduct hívás/óra. Egyet az előnézeti kör már használt.
  const onePageOnly = process.argv.includes("--elso-oldal");
  const page = onePageOnly ? await adapter.listHcProductPage(1) : undefined;
  const result = page ? { ...page, complete: page.sourceCount < 50, pagesFetched: 1 } : await adapter.listHcProducts(29);
  const categories = [...new Set(result.products.map((product) => product.category))].sort((a, b) => a.localeCompare(b, "hu"));
  console.log("UNAS csak olvasó előnézet – adatbázis-módosítás nélkül");
  console.log(`Lekért oldalak: ${result.pagesFetched}`);
  console.log(`Teljes lista: ${result.complete ? "igen" : "nem, az órás biztonsági keretnél megállt"}`);
  console.log(`Forrásrekord: ${result.sourceCount}`);
  console.log(`HC-ként elfogadva: ${result.products.length}`);
  console.log(`UNAS nettó árral érkező termékek: ${result.products.filter((product) => typeof product.netPriceHuf === "number").length}`);
  console.log(`Részletes leírással érkező termékek: ${result.products.filter((product) => Boolean(product.longDescription)).length}`);
  console.log(`Nettó ár nélküli HC termékek: ${result.products.filter((product) => typeof product.netPriceHuf !== "number").length}`);
  console.log(`Nem vásárolható, de engedélyezett: ${result.products.filter((product) => !product.isPurchasable).length}`);
  console.log(`Más márka miatt kizárva: ${result.excludedCount}`);
  console.log(`Engedélyező paraméter hiányzik: ${result.missingAllowCount}`);
  console.log(`Engedélyező paraméter nem 1: ${result.disabledAllowCount}`);
  console.log(`Hibás vagy hiányos: ${result.invalidCount}`);
  console.log(`HC kategóriák: ${categories.length}`);
  for (const category of categories) console.log(`- ${category}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Az UNAS előnézet sikertelen.");
  process.exitCode = 1;
});
