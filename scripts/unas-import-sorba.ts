import "dotenv/config";
import { PgBoss } from "pg-boss";
import { readAppConfig } from "../src/lib/kornyezet-schema";

async function main(): Promise<void> {
  const config = readAppConfig();
  if (config.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("A fejlesztői UNAS importindító production környezetben tiltott.");
  }
  if (!config.DATABASE_URL || !config.UNAS_API_KEY || !config.UNAS_HC_ALLOW_PARAM_ID) {
    throw new Error("A helyi adatbázis és az UNAS szerveroldali beállításai szükségesek.");
  }
  const boss = new PgBoss({ connectionString: config.DATABASE_URL });
  try {
    await boss.start();
    const jobId = await boss.send("unas-termek-import", { task: "full-snapshot" }, {
      singletonKey: `unas-full-snapshot-${new Date().toISOString().slice(0, 16)}`,
      singletonSeconds: 60,
    });
    console.log(jobId ? "A teljes UNAS import munkába állítva." : "Már van ilyen importfeladat a sorban vagy folyamatban.");
  } finally {
    await boss.stop({ graceful: true, timeout: 10_000 });
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Az UNAS import sorba állítása nem sikerült.");
  process.exitCode = 1;
});
