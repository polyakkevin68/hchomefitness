import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({
  betoltVagyLetrehozKosarat: vi.fn(),
  lekerKosarOsszegzes: vi.fn(),
  hozzaadKosarhoz: vi.fn(),
  modositKosarTetelt: vi.fn(),
  torolKosarTetelt: vi.fn(),
  modositSzallitasiModot: vi.fn(),
}));

vi.mock("@/kosar/szerveres-kosar", () => ({
  ...tarolo,
  KOSAR_SUTI: "hc_kosar",
  KosarVerzioHiba: class KosarVerzioHiba extends Error {},
}));

import { DELETE, GET, PATCH, POST, PUT } from "./route";

const munkamenet = "a".repeat(43);
const uresKosar = { verzio: 0, tetelek: [], szallitasiMod: null, termekOsszegHuf: 0, szallitasHuf: null, fizetendoHuf: null, vasarlasEngedelyezett: false };

function keres(method: string, body?: unknown, cookie?: string, origin = "http://localhost:3000") {
  const headers = new Headers({ origin });
  if (cookie) headers.set("cookie", `hc_kosar=${cookie}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest("http://localhost:3000/api/kosar", {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("kosár API útvonal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.betoltVagyLetrehozKosarat.mockResolvedValue({ session: munkamenet, kosarId: "kosar-proba", verzio: 0 });
    tarolo.lekerKosarOsszegzes.mockResolvedValue(uresKosar);
    tarolo.hozzaadKosarhoz.mockResolvedValue(uresKosar);
    tarolo.modositKosarTetelt.mockResolvedValue(uresKosar);
    tarolo.torolKosarTetelt.mockResolvedValue(uresKosar);
    tarolo.modositSzallitasiModot.mockResolvedValue(uresKosar);
  });

  it("a GET munkamenetsütit ad, és tiltja a válasz gyorsítótárazását", async () => {
    const response = await GET(keres("GET"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
    expect(await response.json()).toMatchObject({ vasarlasEngedelyezett: false });
  });

  it("idegen eredetű módosításnál elutasítja a kérést", async () => {
    const response = await PUT(keres("PUT", { termekId: "p1", mennyiseg: 1, verzio: 0 }, munkamenet, "https://masik.example"));
    expect(response.status).toBe(403);
    expect(tarolo.modositKosarTetelt).not.toHaveBeenCalled();
  });

  it("nem fogad el kliens által küldött árat", async () => {
    const response = await PUT(keres("PUT", { termekId: "p1", mennyiseg: 1, verzio: 0, arHuf: 1 }, munkamenet));
    expect(response.status).toBe(400);
    expect(tarolo.modositKosarTetelt).not.toHaveBeenCalled();
  });

  it("a kosárba tétel külön hozzáadó műveletet hív, mennyiséget a szerver növeli", async () => {
    const response = await POST(keres("POST", { termekId: "p1", verzio: 2 }, munkamenet));
    expect(response.status).toBe(200);
    expect(tarolo.hozzaadKosarhoz).toHaveBeenCalledWith(munkamenet, "p1", 2);
  });

  it("a szállításmódot a kosárverzióval módosítja", async () => {
    const response = await PATCH(keres("PATCH", { szallitasiMod: "emeletre", verzio: 4 }, munkamenet));
    expect(response.status).toBe(200);
    expect(tarolo.modositSzallitasiModot).toHaveBeenCalledWith(munkamenet, "emeletre", 4);
  });

  it("a sor törlését munkamenet és verzió alapján kezeli", async () => {
    const response = await DELETE(keres("DELETE", { termekId: "p1", verzio: 3 }, munkamenet));
    expect(response.status).toBe(200);
    expect(tarolo.torolKosarTetelt).toHaveBeenCalledWith(munkamenet, "p1", 3);
  });
});
