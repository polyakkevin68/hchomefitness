import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({ megerositRendelesiKeszletet: vi.fn(), hitelesitAdminMunkamenetet: vi.fn() }));
vi.mock("@/rendeles/szerveres-rendeles", () => ({ ...tarolo }));
vi.mock("@/auth/admin-munkamenet", () => ({ adminSutiNeve: "hc-admin", hitelesitAdminMunkamenetet: tarolo.hitelesitAdminMunkamenetet }));

import { POST } from "./route";

const publicId = "HC-20260925-ABCD23456789";
function keres(body: unknown, token?: string, origin = "http://localhost:3000") {
  const headers = new Headers({ origin, "content-type": "application/json" });
  if (token) headers.set("cookie", `hc-admin=${token}`);
  return new NextRequest(`http://localhost:3000/api/kezeles/rendeles/${publicId}/keszlet`, {
    method: "POST", headers, body: JSON.stringify(body),
  });
}

describe("műveleti készletmegerősítés", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_ENV", "development");
    tarolo.hitelesitAdminMunkamenetet.mockImplementation(async (token: string | undefined, action: string) => token === "ervenyes-munkamenet" && action === "confirm_stock" ? { id: "admin-1", email: "op@test.hu", role: "OPERATIONS" } : null);
    tarolo.megerositRendelesiKeszletet.mockResolvedValue({ publicId, status: "CONFIRMED" });
  });

  it("nem fogad el hiányzó vagy hibás adminmunkamenetet", async () => {
    expect((await POST(keres({ muvelet: "megerosit", megjegyzes: "UNAS-ban 1 db lefoglalva" }), { params: Promise.resolve({ azonosito: publicId }) })).status).toBe(401);
    expect((await POST(keres({ muvelet: "megerosit", megjegyzes: "UNAS-ban 1 db lefoglalva" }, "hibas"), { params: Promise.resolve({ azonosito: publicId }) })).status).toBe(401);
    expect(tarolo.megerositRendelesiKeszletet).not.toHaveBeenCalled();
  });

  it("eredetellenőrzést és műveleti kulcsot követel, majd a szerver rögzíti a döntést", async () => {
    const body = { muvelet: "megerosit", megjegyzes: "UNAS-ban ellenőrizve, 1 db félretéve" };
    expect((await POST(keres(body, "o".repeat(40), "https://masik.example"), { params: Promise.resolve({ azonosito: publicId }) })).status).toBe(403);
    const response = await POST(keres(body, "ervenyes-munkamenet"), { params: Promise.resolve({ azonosito: publicId }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(tarolo.megerositRendelesiKeszletet).toHaveBeenCalledWith(publicId, body.muvelet, body.megjegyzes, "ORDER_OPERATIONS", "admin-1");
  });
});
