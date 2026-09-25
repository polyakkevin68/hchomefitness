import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({ rogzitRendelesiIgenyt: vi.fn(), hitelesitFiokMunkamenetet: vi.fn() }));
vi.mock("@/rendeles/szerveres-rendeles", () => ({ ...tarolo }));
vi.mock("@/kosar/szerveres-kosar", () => ({ KOSAR_SUTI: "hc_kosar" }));
vi.mock("@/fiok/szerveres-fiok", () => ({ fiokSutiNeve: "hc-fiok", hitelesitFiokMunkamenetet: tarolo.hitelesitFiokMunkamenetet, normalizalFiokEmailt: (email: string) => email.trim().toLowerCase() }));

import { POST } from "./route";

const munkamenet = "c".repeat(43);
const kereses = {
  ajanlatToken: "ajanlat-token-minta-legalabb-32-karakter",
  idempotenciaKulcs: "7f2c5aab-6c99-46b7-9d21-0101c5c219be",
  vevo: { nev: "Minta Vásárló", email: "vasarlo@example.test", telefon: "+36301234567" },
  szallitasiCim: { orszag: "HU", iranyitoszam: "1011", telepules: "Budapest", cim: "Teszt utca 1." },
};

function keres(body: unknown, session = munkamenet, origin = "http://localhost:3000", fiokToken?: string) {
  const headers = new Headers({ origin, cookie: `hc_kosar=${session}${fiokToken ? `; hc-fiok=${fiokToken}` : ""}`, "content-type": "application/json" });
  return new NextRequest("http://localhost:3000/api/rendeles", { method: "POST", headers, body: JSON.stringify(body) });
}

describe("rendelési igény API útvonal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.hitelesitFiokMunkamenetet.mockResolvedValue(null);
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ORDER_REQUESTS_ENABLED", "true");
    tarolo.rogzitRendelesiIgenyt.mockResolvedValue({
      rendeles: { publicId: "HC-20260925-ABCD23456789", status: "PENDING_CONFIRMATION", totalHuf: 123_456 },
      vendegToken: "vendeg-hozzaferesi-token-minta",
    });
  });

  it("idegen kérés eredetét elutasítja", async () => {
    const response = await POST(keres(kereses, munkamenet, "https://masik.example"));
    expect(response.status).toBe(403);
    expect(tarolo.rogzitRendelesiIgenyt).not.toHaveBeenCalled();
  });

  it("munkamenet nélkül nem vesz fel rendelési igényt", async () => {
    const headers = new Headers({ origin: "http://localhost:3000", "content-type": "application/json" });
    const response = await POST(new NextRequest("http://localhost:3000/api/rendeles", { method: "POST", headers, body: JSON.stringify(kereses) }));
    expect(response.status).toBe(404);
  });

  it("nem fogad el kliensárat vagy ismeretlen mezőt", async () => {
    const response = await POST(keres({ ...kereses, totalHuf: 1 }));
    expect(response.status).toBe(400);
    expect(tarolo.rogzitRendelesiIgenyt).not.toHaveBeenCalled();
  });

  it("hibás JSON esetén is 400-as választ ad", async () => {
    const request = new NextRequest("http://localhost:3000/api/rendeles", { method: "POST", headers: { origin: "http://localhost:3000", cookie: `hc_kosar=${munkamenet}`, "content-type": "application/json" }, body: "{" });
    expect((await POST(request)).status).toBe(400);
    expect(tarolo.rogzitRendelesiIgenyt).not.toHaveBeenCalled();
  });

  it("a szerver rögzíti a kérést, hozzáférési sütit ad, de tokent nem küld a böngészőnek", async () => {
    const response = await POST(keres(kereses));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toContain("hc_rendeles_HC-20260925-ABCD23456789");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Path=/;");
    expect(await response.json()).toEqual({ rendeles: { publicId: "HC-20260925-ABCD23456789", status: "PENDING_CONFIRMATION", totalHuf: 123_456 } });
    expect(tarolo.rogzitRendelesiIgenyt).toHaveBeenCalledWith(munkamenet, kereses, undefined);
  });

  it("csak igazolt fiókhoz és azonos e-mail-címhez rendeli az új rendelést", async () => {
    tarolo.hitelesitFiokMunkamenetet.mockResolvedValueOnce({ id: "vasarlo-1", email: "VASARLO@example.test", nev: "Minta" });
    await POST(keres(kereses, munkamenet, "http://localhost:3000", "a".repeat(43)));
    expect(tarolo.rogzitRendelesiIgenyt).toHaveBeenCalledWith(munkamenet, kereses, "vasarlo-1");

    vi.clearAllMocks();
    tarolo.hitelesitFiokMunkamenetet.mockResolvedValueOnce({ id: "masik-vasarlo", email: "masik@example.test", nev: "Másik" });
    await POST(keres(kereses, munkamenet, "http://localhost:3000", "b".repeat(43)));
    expect(tarolo.rogzitRendelesiIgenyt).toHaveBeenCalledWith(munkamenet, kereses, undefined);
  });
});
