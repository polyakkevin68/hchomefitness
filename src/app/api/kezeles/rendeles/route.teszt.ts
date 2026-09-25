import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({ listazKezelendoRendeleseket: vi.fn(), hitelesitAdminMunkamenetet: vi.fn() }));
vi.mock("@/rendeles/szerveres-rendeles", () => ({ ...tarolo }));
vi.mock("@/auth/admin-munkamenet", () => ({ adminSutiNeve: "hc-admin", hitelesitAdminMunkamenetet: tarolo.hitelesitAdminMunkamenetet }));

import { GET } from "./route";

function keres(token?: string) {
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (token) headers.set("cookie", `hc-admin=${token}`);
  return new NextRequest("http://localhost:3000/api/kezeles/rendeles", { headers });
}

describe("műveleti függő rendelési lista", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_ENV", "development");
    tarolo.hitelesitAdminMunkamenetet.mockImplementation(async (token: string | undefined, action: string) => token === "ervenyes-munkamenet" && action === "manage_orders" ? { id: "admin-1", email: "op@test.hu", role: "OPERATIONS" } : null);
    tarolo.listazKezelendoRendeleseket.mockResolvedValue([]);
  });

  it("érvényes adminmunkamenet nélkül nem ad rendelési adatot", async () => {
    expect((await GET(keres())).status).toBe(401);
    expect(tarolo.listazKezelendoRendeleseket).not.toHaveBeenCalled();
  });

  it("a hitelesített műveleti szerepnek privát választ ad", async () => {
    const response = await GET(keres("ervenyes-munkamenet"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(tarolo.listazKezelendoRendeleseket).toHaveBeenCalledOnce();
  });

  it("nem megfelelő szerepkörnél megtagadja a személyes adatokat", async () => {
    tarolo.hitelesitAdminMunkamenetet.mockResolvedValueOnce(null);
    const response = await GET(keres("csak-olvasas"));
    expect(response.status).toBe(401);
  });
});
