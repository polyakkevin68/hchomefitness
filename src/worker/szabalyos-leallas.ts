import { logEvent } from "@/lib/naplozas";

type LeallithatoWorker = {
  stop: (options: { graceful: boolean; timeout: number }) => Promise<unknown>;
};

type LevalaszthatoAdatbazis = {
  $disconnect: () => Promise<unknown>;
};

type WorkerNaplozo = (szint: "info" | "error", esemeny: string) => void;

export async function szabalyosanLeallitWorker(
  boss: LeallithatoWorker,
  prisma: LevalaszthatoAdatbazis,
  naplo: WorkerNaplozo = logEvent,
): Promise<boolean> {
  try {
    await boss.stop({ graceful: true, timeout: 10_000 });
  } catch {
    naplo("error", "worker.stop_failed");
    try {
      await boss.stop({ graceful: false, timeout: 1_000 });
    } catch {
      // A bezárási hiba részlete nem kerülhet a naplóba.
    }
    await prisma.$disconnect().catch(() => undefined);
    return false;
  }

  try {
    await prisma.$disconnect();
  } catch {
    naplo("error", "worker.stop_failed");
    return false;
  }

  naplo("info", "worker.stopped");
  return true;
}
