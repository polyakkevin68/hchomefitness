import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { logEvent } from "../src/lib/naplozas";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("A terhelési próbához DATABASE_URL szükséges.");

const databaseUrl = new URL(connectionString);
const databaseName = databaseUrl.pathname.slice(1);
if (!["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname) || !/^hc_m8_terheles_proba(?:_|$)/.test(databaseName)) {
  throw new Error("A próbatermékek csak helyi, hc_m8_terheles_proba kezdetű adatbázisba tölthetők.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  try {
    const existing = await prisma.product.count({ where: { sourceId: { startsWith: "m8-terheles-" } } });
    if (existing !== 0) throw new Error("A terhelési adatbázis már tartalmaz próbatermékeket.");

    await prisma.product.createMany({
      data: Array.from({ length: 1_000 }, (_, index) => {
        const azonosito = String(index + 1).padStart(4, "0");
        return {
          source: "unas",
          sourceId: `m8-terheles-${azonosito}`,
          sku: `M8-TERHELES-${azonosito}`,
          slug: `m8-terhelesi-termek-${azonosito}`,
          name: `HC terhelési termék ${azonosito}`,
          brand: "HC Home Fitness",
          priceHuf: 100_000,
          category: ["Futópadok", "Szobakerékpárok", "Erőgépek", "Kiegészítők"][index % 4],
          description: "Elkülönített, helyi M8 terhelési próbaadat.",
          imageUrls: [],
          attributes: [],
          isPurchasable: false,
          isPublished: true,
          isTestFixture: false,
          isActive: true,
          lastImportedAt: new Date(),
        };
      }),
    });

    const count = await prisma.product.count({ where: { sourceId: { startsWith: "m8-terheles-" }, isPublished: true } });
    if (count !== 1_000) throw new Error(`A terhelési termékek száma nem megfelelő: ${count}.`);
    console.info(`Az elkülönített helyi próbába ${count} termék került.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((hiba: unknown) => {
  logEvent("error", "m8.load_test_data_failed", {
    errorName: hiba instanceof Error ? hiba.name : "UnknownError",
    errorMessage: hiba instanceof Error ? hiba.message : "Ismeretlen hiba.",
  });
  process.exitCode = 1;
});
