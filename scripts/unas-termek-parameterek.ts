import "dotenv/config";
import { readAppConfig } from "../src/lib/kornyezet-schema";
import { UnasProductAdapter } from "../src/catalog/unas-forras";

async function main(): Promise<void> {
  const config = readAppConfig();
  if (config.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("A termékparaméter lekérdezése production környezetben tiltott.");
  }
  const sku = process.argv[2];
  if (!sku) throw new Error("Használat: npm.cmd run unas:parameterek -- ET160I");
  if (!config.UNAS_API_KEY) throw new Error("Az UNAS_API_KEY üres. Töltsd ki a projekt gyökérmappájában lévő .env fájlban.");

  const adapter = new UnasProductAdapter(config.UNAS_API_KEY);
  const result = await adapter.getProductParametersBySku(sku);
  console.log(`Cikkszám: ${result.sku}`);
  console.log(`UNAS termékazonosító: ${result.id || "nincs megadva"}`);
  console.log(`Állapot: ${result.state || "nincs megadva"}; alapkészlet-státusz: ${result.baseStatus || "nincs megadva"}`);
  if (!result.parameters.length) {
    console.log("Ehhez a termékhez nem érkezett termékparaméter.");
    return;
  }
  for (const parameter of result.parameters) {
    const name = parameter.name.replace(/[\r\n\t]/g, " ").slice(0, 120);
    const value = parameter.value.replace(/[\r\n\t]/g, " ").slice(0, 240);
    console.log(`Azonosító: ${parameter.id} | Név: ${name} | Érték: ${value}`);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Az UNAS terméklekérdezés sikertelen.");
  process.exitCode = 1;
});
