import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({ authenticate: vi.fn(), findProduct: vi.fn(), create: vi.fn(), update: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/auth/admin-munkamenet", () => ({ adminSutiNeve: "hc-admin", hitelesitAdminMunkamenetet: tarolo.authenticate }));
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: { termekAjanlo: { findMany: vi.fn() }, product: { findFirst: tarolo.findProduct }, $transaction: tarolo.transaction } }));
import { PATCH, POST } from "./route";

const admin = { id: "tartalom-1", email: "szerkeszto@example.test", role: "CONTENT" as const };
const url = "https://bolt.example.test/api/kezeles/ajanlok";
function keres(metodus: string, adat: unknown, origin = "https://bolt.example.test") { return new NextRequest(url, { method: metodus, headers: { origin, cookie: "hc-admin=proba", "content-type": "application/json" }, body: JSON.stringify(adat) }); }

describe("termékajánló-kezelő API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.authenticate.mockResolvedValue(admin);
    tarolo.findProduct.mockImplementation(async ({ where }) => ({ id: where.slug }));
    tarolo.create.mockResolvedValue({ id: "a1", aktiv: false, forrasTermek: { sku: "HC-1" }, celTermek: { sku: "HC-2" } });
    tarolo.update.mockResolvedValue({ id: "a1", aktiv: true });
    tarolo.audit.mockResolvedValue({});
    tarolo.transaction.mockImplementation(async (futtat) => futtat({ termekAjanlo: { create: tarolo.create, update: tarolo.update }, adminAuditLog: { create: tarolo.audit } }));
  });

  it("csak igazolt HC/UNAS termékeket kapcsol össze, kikapcsolt állapotban", async () => {
    const response = await POST(keres("POST", { forrasSlug: "futo", celSlug: "szonyeg" }));
    expect(response.status).toBe(201);
    expect(tarolo.findProduct).toHaveBeenCalledTimes(2);
    expect(tarolo.create).toHaveBeenCalledWith({ data: { forrasTermekId: "futo", celTermekId: "szonyeg" }, include: expect.any(Object) });
    expect(tarolo.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "product_recommendation_created" }) });
  });

  it("elutasítja önmagára mutató ajánlást és idegen eredetet", async () => {
    expect((await POST(keres("POST", { forrasSlug: "futo", celSlug: "futo" }))).status).toBe(400);
    expect((await POST(keres("POST", { forrasSlug: "futo", celSlug: "szonyeg" }, "https://idegen.test"))).status).toBe(403);
    expect(tarolo.transaction).not.toHaveBeenCalled();
  });

  it("csak szerkesztői munkamenettel engedélyezi az állapotmódosítást", async () => {
    tarolo.authenticate.mockResolvedValueOnce(null);
    expect((await PATCH(keres("PATCH", { ajanloId: "a1", aktiv: true }))).status).toBe(401);
    expect(tarolo.transaction).not.toHaveBeenCalled();
  });
});
