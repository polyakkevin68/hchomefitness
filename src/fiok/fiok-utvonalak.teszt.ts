import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({
  inditFiokIgazolast: vi.fn(), beleptetFiokot: vi.fn(), igazolFiokEmailt: vi.fn(),
  hitelesitFiokMunkamenetet: vi.fn(), kijelentkeztetFiokot: vi.fn(),
  fiokCimLetrehoz: vi.fn(), fiokCimTorol: vi.fn(), fiokCimek: vi.fn(), fiokRendelesek: vi.fn(), kapcsolKorabbiRendelestFiokhoz: vi.fn(),
}));

vi.mock("@/fiok/szerveres-fiok", () => ({ ...tarolo, fiokSutiNeve: "hc-fiok", fiokMunkamenetNap: 30 }));

import { POST as regisztracio } from "@/app/api/fiok/regisztracio/route";
import { POST as belepes } from "@/app/api/fiok/bejelentkezes/route";
import { POST as igazolas } from "@/app/api/fiok/igazolas/route";
import { POST as kijelentkezes } from "@/app/api/fiok/kijelentkezes/route";
import { GET as fiokAdatok } from "@/app/api/fiok/route";

const eredet = "https://bolt.example.test";
function kerelem(url: string, body?: unknown, cookie = "", origin = eredet) {
  return new NextRequest(`${eredet}${url}`, { method: "POST", headers: { ...(origin ? { origin } : {}), ...(cookie ? { cookie } : {}), "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("vásárlói fiók API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.inditFiokIgazolast.mockResolvedValue({ sikeres: true });
    tarolo.beleptetFiokot.mockResolvedValue({ fiok: { id: "f1", email: "vevo@example.test", nev: "Vevő" }, token: "a".repeat(43), expiresAt: new Date(Date.now() + 86_400_000) });
    tarolo.igazolFiokEmailt.mockResolvedValue({ fiok: { id: "f1", email: "vevo@example.test", nev: "Vevő" }, token: "b".repeat(43), expiresAt: new Date(Date.now() + 86_400_000) });
    tarolo.hitelesitFiokMunkamenetet.mockResolvedValue(null);
  });

  it("az idegen eredetű regisztrációt még a fiók létrehozása előtt elutasítja", async () => {
    const response = await regisztracio(kerelem("/api/fiok/regisztracio", { nev: "Vevő Név", email: "vevo@example.test", jelszo: "legalább tizennégy karakter" }, "", "https://idegen.example"));
    expect(response.status).toBe(403);
    expect(tarolo.inditFiokIgazolast).not.toHaveBeenCalled();
  });

  it("nem fed fel fióklétezést a regisztráció sikerüzenetével", async () => {
    const response = await regisztracio(kerelem("/api/fiok/regisztracio", { nev: "Vevő Név", email: "vevo@example.test", jelszo: "legalább tizennégy karakter" }));
    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ uzenet: "Ha a fiók aktiválható, e-mailben elküldtük az igazolás lépéseit." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("belépéskor csak HTTP-only, SameSite-sütit ad vissza", async () => {
    const response = await belepes(kerelem("/api/fiok/bejelentkezes", { email: "vevo@example.test", jelszo: "helyes jelszó" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toContain("hc-fiok=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
    expect(await response.json()).toEqual({ fiok: { id: "f1", email: "vevo@example.test", nev: "Vevő" } });
  });

  it("igazoláskor sütit csak egyszer használható token után állít be", async () => {
    const response = await igazolas(kerelem("/api/fiok/igazolas", { token: "t".repeat(43) }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(tarolo.igazolFiokEmailt).toHaveBeenCalledWith("t".repeat(43));
  });

  it("belépés nélkül nem ad vissza fiókadatot", async () => {
    const request = new NextRequest(`${eredet}/api/fiok`, { method: "GET" });
    expect((await fiokAdatok(request)).status).toBe(401);
    expect(tarolo.fiokRendelesek).not.toHaveBeenCalled();
  });

  it("kijelentkezéskor visszavonja a munkamenetet és lejáratja a sütit", async () => {
    const response = await kijelentkezes(kerelem("/api/fiok/kijelentkezes", {}, "hc-fiok=" + "a".repeat(43)));
    expect(response.status).toBe(200);
    expect(tarolo.kijelentkeztetFiokot).toHaveBeenCalledWith("a".repeat(43));
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
