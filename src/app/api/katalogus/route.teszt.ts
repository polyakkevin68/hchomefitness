import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ search: vi.fn(), log: vi.fn() }));
vi.mock("@/catalog/katalogus", () => ({ getCatalogPage: mocked.search }));
vi.mock("@/lib/naplozas", () => ({ logEvent: mocked.log }));

import { GET } from "./route";

describe("publikus katalógus API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.search.mockResolvedValue({
      termekek: [{ sku: "HC-1", slug: "hc-1", name: "Teszt termék", category: "Futópadok", priceHuf: 100_000, imageUrls: ["https://kepek.example/1.webp", "https://kepek.example/2.webp"], isPurchasable: false, source: "unas", keszlet: { allapot: "ismeretlen" }, description: "belső leírás", attributes: [], sourceId: "titkos-azonosító", brand: "HC Home Fitness", isTestFixture: false }],
      szurtTermekekSzama: 1, osszesTermekSzama: 1_000, kategoriak: ["Futópadok"], oldal: 1, oldalakSzama: 84,
    });
  });

  it("a szűrőket és lapot átadja, és tiltja a gyorsítótárazást", async () => {
    const response = await GET(new Request("http://localhost/api/katalogus?keres=HC&kategoria=Fut%C3%B3padok&rendezes=nev&oldal=2"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocked.search).toHaveBeenCalledWith({ keres: "HC", kategoria: "Futópadok", rendezes: "nev", oldal: "2" });
    expect((await response.json()).termekek[0]).toEqual({
      sku: "HC-1", slug: "hc-1", name: "Teszt termék", category: "Futópadok", priceHuf: 100_000,
      imageUrl: "https://kepek.example/1.webp", isPurchasable: false, source: "unas", keszlet: { allapot: "ismeretlen" },
    });
  });

  it("elutasítja a túl hosszú lekérdezést az adatbázis hívása előtt", async () => {
    const response = await GET(new Request(`http://localhost/api/katalogus?keres=${"x".repeat(121)}`));
    expect(response.status).toBe(400);
    expect(mocked.search).not.toHaveBeenCalled();
  });

  it("adatbázishibánál semleges 503-at ad és biztonságos eseményt naplóz", async () => {
    mocked.search.mockRejectedValue(new Error("postgresql://titok:secret@localhost/hc"));
    const response = await GET(new Request("http://localhost/api/katalogus"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "A katalógus átmenetileg nem érhető el." });
    expect(mocked.log).toHaveBeenCalledWith("error", "catalog.api.failed");
  });
});
