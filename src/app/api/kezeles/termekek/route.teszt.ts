import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forrasKategoriak } from "@/catalog/katalogus-kategoriak";

const tarolo = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/auth/admin-munkamenet", () => ({ adminSutiNeve: "hc-admin", hitelesitAdminMunkamenetet: tarolo.auth }));
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: { product: { findMany: tarolo.findMany }, $transaction: tarolo.transaction } }));

import { GET, PATCH } from "./route";

const bolt = "https://bolt.example.test";
function keres(method: string, adat?: unknown, origin = bolt) {
  return new NextRequest(`${bolt}/api/kezeles/termekek`, { method, headers: { ...(method !== "GET" ? { origin, "content-type": "application/json" } : {}), cookie: "hc-admin=owner" }, ...(adat === undefined ? {} : { body: JSON.stringify(adat) }) });
}

describe("tulajdonosi termékjóváhagyás API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.auth.mockResolvedValue({ id: "owner-1", email: "owner@example.test", role: "OWNER" });
    tarolo.findMany.mockResolvedValue([{ id: "p-1", sku: "HC-1", category: "Futópadok", isPublished: false, keszlet: null }]);
    tarolo.findFirst.mockResolvedValue({ id: "p-1", sku: "HC-1", isPublished: false });
    tarolo.update.mockResolvedValue({ id: "p-1", sku: "HC-1", isPublished: true });
    tarolo.audit.mockResolvedValue({});
    tarolo.transaction.mockImplementation((run) => run({ product: { findFirst: tarolo.findFirst, update: tarolo.update }, adminAuditLog: { create: tarolo.audit } }));
  });

  it("csak valódi, aktív HC/UNAS-termékeket listáz OWNER belépéssel", async () => {
    const response = await GET(keres("GET"));
    expect(response.status).toBe(200);
    expect(tarolo.auth).toHaveBeenCalledWith("owner", "publish_products");
    expect(tarolo.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { source: "unas", brand: "HC Home Fitness", isActive: true, isTestFixture: false, category: { in: forrasKategoriak } } }));
  });

  it("publikáláskor állapotot ment és auditbejegyzést készít", async () => {
    const response = await PATCH(keres("PATCH", { termekId: "p-1", publikalt: true }));
    expect(response.status).toBe(200);
    expect(tarolo.update).toHaveBeenCalledWith({ where: { id: "p-1" }, data: { isPublished: true }, select: expect.any(Object) });
    expect(tarolo.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ adminUserId: "owner-1", action: "product_published", targetType: "Product", targetId: "p-1" }) });
  });

  it("elutasítja az idegen eredetet, a nem OWNER szerepet és az érvénytelen terméket", async () => {
    expect((await PATCH(keres("PATCH", { termekId: "p-1", publikalt: true }, "https://idegen.example"))).status).toBe(403);
    tarolo.auth.mockResolvedValueOnce(null);
    expect((await PATCH(keres("PATCH", { termekId: "p-1", publikalt: true }))).status).toBe(401);
    tarolo.auth.mockResolvedValue({ id: "owner-1", role: "OWNER" });
    tarolo.findFirst.mockResolvedValueOnce(null);
    expect((await PATCH(keres("PATCH", { termekId: "wrong", publikalt: true }))).status).toBe(404);
    expect(tarolo.audit).not.toHaveBeenCalled();
  });
});
