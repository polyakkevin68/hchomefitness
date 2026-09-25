import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { KosarHiba } from "@/penztar/osszegzes";

const tarolo = vi.hoisted(() => ({ keszitAjanlatot: vi.fn() }));

vi.mock("@/penztar/szerveres-ajanlat", () => ({ ...tarolo, KuponHiba: class KuponHiba extends Error {} }));
vi.mock("@/kosar/szerveres-kosar", () => ({
  KOSAR_SUTI: "hc_kosar",
  KosarVerzioHiba: class KosarVerzioHiba extends Error {},
}));

import { POST } from "./route";

const munkamenet = "b".repeat(43);

function keres(body?: unknown, cookie?: string, origin = "http://localhost:3000") {
  const headers = new Headers({ origin });
  if (cookie) headers.set("cookie", `hc_kosar=${cookie}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest("http://localhost:3000/api/penztar/ajanlat", {
    method: "POST",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("lejáró ajánlat API útvonal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.keszitAjanlatot.mockResolvedValue({ token: "proba-token", fizetendoHuf: 266_812, vasarlasEngedelyezett: false });
  });

  it("elutasítja az idegen eredetről érkező kérést", async () => {
    const response = await POST(keres({ verzio: 3 }, munkamenet, "https://masik.example"));
    expect(response.status).toBe(403);
    expect(tarolo.keszitAjanlatot).not.toHaveBeenCalled();
  });

  it("munkamenetsüti nélkül nem készít ajánlatot", async () => {
    const response = await POST(keres({ verzio: 3 }));
    expect(response.status).toBe(404);
    expect(tarolo.keszitAjanlatot).not.toHaveBeenCalled();
  });

  it("elutasítja a hibás vagy kliensárat tartalmazó bemenetet", async () => {
    const response = await POST(keres({ verzio: 3, arHuf: 1 }, munkamenet));
    expect(response.status).toBe(400);
    expect(tarolo.keszitAjanlatot).not.toHaveBeenCalled();
  });

  it("csak a munkamenetet és a kosár verzióját adja át a szervernek", async () => {
    const response = await POST(keres({ verzio: 3 }, munkamenet));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(tarolo.keszitAjanlatot).toHaveBeenCalledWith(munkamenet, 3, undefined);
    expect(await response.json()).toMatchObject({ fizetendoHuf: 266_812, vasarlasEngedelyezett: false });
  });

  it("kuponkódot a szervernek adja át, nem fogad el böngészőből érkező kedvezményösszeget", async () => {
    const response = await POST(keres({ verzio: 3, kuponKod: "hc10", kedvezmenyHuf: 1 }, munkamenet));
    expect(response.status).toBe(400);
    expect(tarolo.keszitAjanlatot).not.toHaveBeenCalled();
    const jo = await POST(keres({ verzio: 3, kuponKod: "hc10" }, munkamenet));
    expect(jo.status).toBe(200);
    expect(tarolo.keszitAjanlatot).toHaveBeenCalledWith(munkamenet, 3, "hc10");
  });

  it("elavult forrásadatnál átmeneti hibával jelzi, hogy az ajánlat most nem készíthető el", async () => {
    tarolo.keszitAjanlatot.mockRejectedValue(new KosarHiba("A termék ára frissítés alatt áll.", "FORRAS_ADAT_ELAVULT"));
    const response = await POST(keres({ verzio: 3 }, munkamenet));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ kod: "FORRAS_ADAT_ELAVULT" });
  });
});
