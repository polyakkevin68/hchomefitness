import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({
  hitelesit: vi.fn(), kuponLista: vi.fn(), kuponLetrehoz: vi.fn(), kuponAllapot: vi.fn(), naplo: vi.fn(), tranzakcio: vi.fn(),
}));
vi.mock("@/auth/admin-munkamenet", () => ({ adminSutiNeve: "hc-admin", hitelesitAdminMunkamenetet: tarolo.hitelesit }));
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: { kupon: { findMany: tarolo.kuponLista }, $transaction: tarolo.tranzakcio } }));

import { GET, PATCH, POST } from "./route";
const url = "https://bolt.example.test/api/kezeles/kuponok";
const admin = { id: "tartalom-1", email: "tartalom@example.test", role: "CONTENT" as const };
const kuponAdat = {
  kod: "HC10", tipus: "SZAZALEK", ertek: 10, minimumHuf: 0, maximumHuf: null,
  indulAt: "2026-09-25T00:00:00.000Z", lejarAt: "2026-10-01T00:00:00.000Z", felhasznalasiKeret: 5,
  osszevonhato: false, kategoriak: ["Futópadok"], cikkszamok: [],
};
function kerelem(metodus: string, body?: unknown, eredet = "https://bolt.example.test") {
  return new NextRequest(url, { method: metodus, headers: { origin: eredet, cookie: "hc-admin=valid-session", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

describe("kuponkezelő API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.hitelesit.mockResolvedValue(admin);
    tarolo.kuponLetrehoz.mockImplementation(async ({ data }) => ({ id: "kupon-1", ...data }));
    tarolo.kuponAllapot.mockImplementation(async ({ where, data }) => ({ id: where.id, kod: "HC10", ...data }));
    tarolo.naplo.mockResolvedValue({});
    tarolo.tranzakcio.mockImplementation(async (munkamenet) => munkamenet({ kupon: { create: tarolo.kuponLetrehoz, update: tarolo.kuponAllapot }, adminAuditLog: { create: tarolo.naplo } }));
  });

  it("csak tartalomszerkesztő vagy tulajdonos kérheti le", async () => {
    tarolo.hitelesit.mockResolvedValueOnce(null);
    expect((await GET(kerelem("GET"))).status).toBe(401);
  });

  it("idegen eredetből nem hoz létre kupont", async () => {
    const response = await POST(kerelem("POST", kuponAdat, "https://idegen.example"));
    expect(response.status).toBe(403);
    expect(tarolo.tranzakcio).not.toHaveBeenCalled();
  });

  it("validál és kikapcsolt állapotban ment, a naplóval közös tranzakcióban", async () => {
    const response = await POST(kerelem("POST", kuponAdat));
    expect(response.status).toBe(201);
    expect(tarolo.kuponLetrehoz).toHaveBeenCalledWith({ data: expect.objectContaining({ kod: "HC10", aktiv: false, indulAt: new Date(kuponAdat.indulAt), lejarAt: new Date(kuponAdat.lejarAt) }) });
    expect(tarolo.naplo).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "coupon_created", targetType: "Kupon" }) });
  });

  it("száz százaléknál nagyobb kedvezményt elutasít", async () => {
    expect((await POST(kerelem("POST", { ...kuponAdat, ertek: 101 }))).status).toBe(400);
    expect(tarolo.tranzakcio).not.toHaveBeenCalled();
  });

  it("aktiválás és kikapcsolás auditált", async () => {
    const response = await PATCH(kerelem("PATCH", { kuponId: "kupon-1", aktiv: true }));
    expect(response.status).toBe(200);
    expect(tarolo.kuponAllapot).toHaveBeenCalledWith({ where: { id: "kupon-1" }, data: { aktiv: true } });
    expect(tarolo.naplo).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "coupon_activated", targetId: "kupon-1" }) });
  });
});
