import { describe, expect, it, vi } from "vitest";
import { szabalyosanLeallitWorker } from "./szabalyos-leallas";

describe("worker szabályos leállítása", () => {
  it("előbb leállítja a feldolgozót, majd az adatbázist, és naplózza a sikert", async () => {
    const muveletek: string[] = [];
    const naplo = vi.fn((_szint: string, esemeny: string) => muveletek.push(esemeny));
    const boss = { stop: vi.fn(async () => { muveletek.push("boss.stop"); }) };
    const prisma = { $disconnect: vi.fn(async () => { muveletek.push("prisma.disconnect"); }) };

    await expect(szabalyosanLeallitWorker(boss, prisma, naplo)).resolves.toBe(true);

    expect(boss.stop).toHaveBeenCalledWith({ graceful: true, timeout: 10_000 });
    expect(muveletek).toEqual(["boss.stop", "prisma.disconnect", "worker.stopped"]);
  });

  it("hibás kíméletes leállás után kényszerített lezárást és hibajelzést végez", async () => {
    const muveletek: string[] = [];
    const naplo = vi.fn((_szint: string, esemeny: string) => muveletek.push(esemeny));
    const boss = { stop: vi.fn().mockImplementationOnce(async () => { throw new Error("hiba"); }).mockImplementationOnce(async () => { muveletek.push("boss.stop.force"); }) };
    const prisma = { $disconnect: vi.fn(async () => { muveletek.push("prisma.disconnect"); }) };

    await expect(szabalyosanLeallitWorker(boss, prisma, naplo)).resolves.toBe(false);

    expect(boss.stop).toHaveBeenNthCalledWith(1, { graceful: true, timeout: 10_000 });
    expect(boss.stop).toHaveBeenNthCalledWith(2, { graceful: false, timeout: 1_000 });
    expect(muveletek).toEqual(["worker.stop_failed", "boss.stop.force", "prisma.disconnect"]);
  });
});
