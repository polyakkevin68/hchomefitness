import { beforeEach, describe, expect, it, vi } from "vitest";

const adatbazis = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: { $queryRaw: adatbazis.query } }));

import { GET } from "./route";

describe("állapot API", () => {
  beforeEach(() => {
    adatbazis.query.mockReset();
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CATALOG_ADAPTER", "fixture");
  });

  it("200-at és adatbázis-állapotot ad sikeres kapcsolódáskor", async () => {
    adatbazis.query.mockResolvedValueOnce([{ "?column?": 1 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok", mode: "fixture", dependencies: { database: "ok" } });
  });

  it("503-at ad, ha az adatbázis nem érhető el, és nem szivárogtat hibaadatot", async () => {
    adatbazis.query.mockRejectedValueOnce(new Error("titkos kapcsolati hiba"));
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ status: "degraded", dependencies: { database: "unavailable" } });
    expect(JSON.stringify(body)).not.toContain("titkos kapcsolati hiba");
  });
});
