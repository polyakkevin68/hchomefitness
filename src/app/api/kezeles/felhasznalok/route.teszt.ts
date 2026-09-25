import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({
  hitelesit: vi.fn(), hashJelszo: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn(),
  tranzakcio: vi.fn(),
}));
vi.mock("@/auth/admin-munkamenet", () => ({ adminSutiNeve: "hc-admin", hitelesitAdminMunkamenetet: tarolo.hitelesit }));
vi.mock("@/auth/admin-hitelesites", () => ({ hashAdminJelszot: tarolo.hashJelszo }));
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: {
  adminUser: { findMany: tarolo.findMany, findUnique: tarolo.findUnique },
  $transaction: tarolo.tranzakcio,
} }));

import { GET, PATCH, POST } from "./route";

const admin = { id: "owner-1", email: "tulajdonos@hc.test", role: "OWNER" as const };
function keres(utvonal: string, method = "GET", adat?: unknown, origin = "http://localhost:3000") {
  const headers = new Headers({ origin, "content-type": "application/json", cookie: "hc-admin=ervenyes-munkamenet" });
  return new NextRequest(`http://localhost:3000${utvonal}`, { method, headers, ...(adat === undefined ? {} : { body: JSON.stringify(adat) }) });
}

describe("kezelői fiókok API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.hitelesit.mockResolvedValue(admin);
    tarolo.hashJelszo.mockResolvedValue("scrypt$hash");
    tarolo.findMany.mockResolvedValue([]);
    tarolo.tranzakcio.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      adminUser: { findUnique: tarolo.findUnique, count: tarolo.count, update: tarolo.update },
      adminSession: { updateMany: tarolo.updateMany },
      adminAuditLog: { create: tarolo.create },
    }));
    tarolo.findUnique.mockResolvedValue({ id: "kezelo-1", email: "kezelo@hc.test", role: "OPERATIONS", isActive: true, createdAt: new Date() });
    tarolo.count.mockResolvedValue(2);
    tarolo.update.mockResolvedValue({ id: "kezelo-1", email: "kezelo@hc.test", role: "OPERATIONS", isActive: false, createdAt: new Date() });
    tarolo.updateMany.mockResolvedValue({ count: 1 });
    tarolo.create.mockResolvedValue({});
  });

  it("a listát OWNER munkamenethez köti, és csak nyilvános fiókmezőket ad vissza", async () => {
    tarolo.findMany.mockResolvedValue([{ id: "u1", email: "u@hc.test", role: "READ_ONLY", isActive: true, createdAt: new Date() }]);
    const response = await GET(keres("/api/kezeles/felhasznalok"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(tarolo.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.not.objectContaining({ passwordHash: expect.anything() }) }));
  });

  it("elutasítja a hiányzó jogosultságot és az idegen eredetű módosítást", async () => {
    tarolo.hitelesit.mockResolvedValueOnce(null);
    expect((await POST(keres("/api/kezeles/felhasznalok", "POST", {}))).status).toBe(401);
    expect((await PATCH(keres("/api/kezeles/felhasznalok", "PATCH", { felhasznaloId: "x", aktiv: false }, "https://idegen.test"))).status).toBe(403);
    expect(tarolo.tranzakcio).not.toHaveBeenCalled();
  });

  it("jelszót kér, és csak engedélyezett szerepkörrel hoz létre fiókot", async () => {
    const response = await POST(keres("/api/kezeles/felhasznalok", "POST", { email: "uj@hc.test", jelszo: "rovid", szerepkor: "OPERATIONS" }));
    expect(response.status).toBe(400);
    expect(tarolo.hashJelszo).not.toHaveBeenCalled();
  });

  it("a saját fiókot nem tiltja le", async () => {
    const response = await PATCH(keres("/api/kezeles/felhasznalok", "PATCH", { felhasznaloId: admin.id, aktiv: false }));
    expect(response.status).toBe(409);
    expect(tarolo.tranzakcio).not.toHaveBeenCalled();
  });

  it("megőrzi az utolsó aktív tulajdonost", async () => {
    tarolo.findUnique.mockResolvedValue({ id: "tulajdonos-2", email: "masik@hc.test", role: "OWNER", isActive: true, createdAt: new Date() });
    tarolo.count.mockResolvedValue(1);
    const response = await PATCH(keres("/api/kezeles/felhasznalok", "PATCH", { felhasznaloId: "tulajdonos-2", aktiv: false }));
    expect(response.status).toBe(409);
    expect(tarolo.update).not.toHaveBeenCalled();
  });

  it("letiltáskor visszavonja a célfiók munkameneteit és auditál", async () => {
    const response = await PATCH(keres("/api/kezeles/felhasznalok", "PATCH", { felhasznaloId: "kezelo-1", aktiv: false }));
    expect(response.status).toBe(200);
    expect(tarolo.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { adminUserId: "kezelo-1", revokedAt: null } }));
    expect(tarolo.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "admin_user_deactivated", adminUserId: admin.id }) }));
  });
});
