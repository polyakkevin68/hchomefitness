import "dotenv/config";
import { PgBoss } from "pg-boss";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { UnasProductAdapter } from "../catalog/unas-forras";
import { importProducts, UNAS_TELJES_IMPORT_CRON } from "../catalog/termek-import";
import { UNAS_KESZLET_SZINKRON_CRON, szinkronizalUnasKeszletet } from "../catalog/keszlet-szinkron";
import { takaritLejartKosarakat } from "../kosar/lejart-kosar-takaritas";
import { readAppConfig } from "../lib/kornyezet-schema";
import { logEvent } from "@/lib/naplozas";
import { szabalyosanLeallitWorker } from "./szabalyos-leallas";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL szükséges a worker indításához.");
const QUEUE = "unas-termek-import";
const KOSAR_TAKARITO_QUEUE = "hc-lejart-kosarak-takaritasa";
const UNAS_KESZLET_QUEUE = "hc-unas-keszlet-szinkron";
type ImportJob = { task: "full-snapshot" };
type CartCleanupJob = { task: "expired-carts" };
type StockSyncJob = { task: "sync-stock" };

async function runWorker(): Promise<void> {
  const config = readAppConfig();
  const boss = new PgBoss({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  boss.on("error", (error: Error & { code?: string }) => {
    const safeMessage = error.message
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[ADATBAZIS-KAPCSOLAT-ELTAKARVA]")
      .replace(/Bearer\s+[^\s]+/gi, "Bearer [ELTAKARVA]")
      .replace(/UNAS_API_KEY[^\s,;]*/gi, "UNAS_API_KEY=[ELTAKARVA]")
      .slice(0, 180);
    logEvent("error", "worker.queue_error", {
      errorName: error.name,
      errorCode: error.code ?? null,
      errorMessage: safeMessage,
    });
  });
  await boss.start();
  await boss.createQueue(QUEUE);
  if (config.UNAS_API_KEY && config.UNAS_HC_ALLOW_PARAM_ID) {
    await boss.schedule(QUEUE, UNAS_TELJES_IMPORT_CRON, { task: "full-snapshot" }, {
      tz: "Europe/Budapest",
      retryLimit: 3,
      retryDelay: 60,
    });
  } else {
    logEvent("warn", "worker.unas_product_sync.disabled");
  }
  await boss.work<ImportJob>(QUEUE, { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      if (job.data.task !== "full-snapshot") throw new Error("Ismeretlen UNAS importfeladat.");
      if (!config.UNAS_API_KEY || !config.UNAS_HC_ALLOW_PARAM_ID) throw new Error("Az UNAS szerveroldali kapcsolata nincs beállítva.");
      const adapter = new UnasProductAdapter(config.UNAS_API_KEY, config.UNAS_HC_ALLOW_PARAM_ID);
      const snapshot = await adapter.listHcProducts();
      if (!snapshot.complete) throw new Error("A teljes UNAS terméklista nem érkezett meg; a szinkron nem módosít adatbázist.");
      if (snapshot.invalidCount > 0) throw new Error("Az UNAS válasz hibás rekordot tartalmaz; előnézet és javítás szükséges.");
      const result = await importProducts(prisma, {
        source: "unas",
        products: snapshot.products,
        excludedSourceIds: snapshot.excludedSourceIds,
        excludedCount: snapshot.excludedCount,
        invalidCount: snapshot.invalidCount,
        fetchComplete: snapshot.complete,
      });
      logEvent("info", "worker.unas_import.completed", {
        jobId: job.id,
        statusCode: 200,
        pagesFetched: snapshot.pagesFetched,
        acceptedCount: result.createdCount + result.updatedCount + result.unchangedCount,
        excludedCount: snapshot.excludedCount,
        invalidCount: result.invalidCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        unchangedCount: result.unchangedCount,
        deactivatedCount: result.deactivatedCount,
      });
      if (!result.complete) throw new Error("Az UNAS import nem tekinthető teljesnek.");
    }
  });
  await boss.createQueue(KOSAR_TAKARITO_QUEUE);
  await boss.schedule(KOSAR_TAKARITO_QUEUE, "15 3 * * *", { task: "expired-carts" }, {
    tz: "Europe/Budapest",
    retryLimit: 3,
    retryDelay: 60,
  });
  await boss.work<CartCleanupJob>(KOSAR_TAKARITO_QUEUE, { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      if (job.data.task !== "expired-carts") throw new Error("Ismeretlen kosártakarítási feladat.");
      const eredmeny = await takaritLejartKosarakat();
      logEvent("info", "worker.expired_carts.cleaned", {
        jobId: job.id,
        deletedCarts: eredmeny.toroltKosarak,
        deletedQuotes: eredmeny.toroltAjanlatok,
      });
    }
  });
  if (config.UNAS_API_KEY) {
    await boss.createQueue(UNAS_KESZLET_QUEUE);
    await boss.schedule(UNAS_KESZLET_QUEUE, UNAS_KESZLET_SZINKRON_CRON, { task: "sync-stock" }, {
      tz: "Europe/Budapest",
      retryLimit: 3,
      retryDelay: 60,
    });
    await boss.work<StockSyncJob>(UNAS_KESZLET_QUEUE, { localConcurrency: 1 }, async (jobs) => {
      for (const job of jobs) {
        if (job.data.task !== "sync-stock") throw new Error("Ismeretlen UNAS készletszinkron-feladat.");
        if (!config.UNAS_API_KEY) throw new Error("Az UNAS szerveroldali kapcsolata nincs beállítva.");
        const adapter = new UnasProductAdapter(config.UNAS_API_KEY);
        const result = await szinkronizalUnasKeszletet(prisma, (skus) => adapter.getStocksBySku(skus));
        logEvent("info", "worker.unas_stock_sync.completed", {
          jobId: job.id,
          updatedCount: result.updatedCount,
          unknownCount: result.unknownCount,
        });
      }
    });
  } else {
    logEvent("warn", "worker.unas_stock_sync.disabled");
  }
  logEvent("info", "worker.started");

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    const stopped = await szabalyosanLeallitWorker(boss, prisma);
    process.exitCode = stopped ? 0 : 1;
  };
  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
}

void runWorker().catch(() => {
  logEvent("error", "worker.start_failed");
  process.exitCode = 1;
});
