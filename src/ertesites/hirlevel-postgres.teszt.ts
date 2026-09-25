import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/adatbazis-kapcsolat";

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);
vi.stubEnv("APP_ENV", "test");
vi.stubEnv("MAILERSEND_PROVIDER", "mailersend");
vi.stubEnv("MAILERSEND_MODE", "allowlist");
vi.stubEnv("MAILERSEND_API_KEY", "hirlevel-teszt-kulcs");
vi.stubEnv("MAILERSEND_FROM_EMAIL", "bolt@example.test");
vi.stubEnv("MAILERSEND_FROM_NAME", "HC teszt");
vi.stubEnv("MAILERSEND_ALLOWED_RECIPIENTS", "hirlevel@example.test");
vi.stubEnv("PUBLIC_BASE_URL", "https://bolt.example.test");
vi.stubEnv("NEWSLETTER_ENABLED", "true");
vi.stubEnv("NEWSLETTER_CONSENT_VERSION", "hirlevel-teszt-v1");
vi.stubEnv("NEWSLETTER_PRIVACY_URL", "https://bolt.example.test/adatkezeles");

import { frissitHirlevelKuldesAllapotot, igazolHirlevelFeliratkozast, leiratkozikHirlevelrol } from "./hirlevel";

describe("hírlevél-feliratkozás PostgreSQL-en", () => {
  const email = "hirlevel@example.test";
  beforeAll(() => fetchMock.mockResolvedValue(new Response(null, { status: 202, headers: { "x-message-id": "message_hirlevel_123" } })));
  afterAll(async () => { await prisma.hirlevelFeliratkozas.deleteMany({ where: { email } }); await prisma.$disconnect(); });

  it("csak a hozzájárult és szerver által rögzített kérelmet fogadja el, majd egyszer igazolható", async () => {
    const { feliratkozikHirlevelre } = await import("./hirlevel");
    expect(await feliratkozikHirlevelre(email, false)).toEqual({ status: "CONSENT_REQUIRED" });
    const eredmeny = await feliratkozikHirlevelre(email, true);
    expect(eredmeny).toEqual({ status: "PERSISTED" });
    const rekord = await prisma.hirlevelFeliratkozas.findUniqueOrThrow({ where: { email } });
    expect(rekord.hozzajarultAt).toBeInstanceOf(Date);
    expect(rekord.hozzajarulasVerzio).toBe("hirlevel-teszt-v1");
    expect(rekord.szolgaltatoiAllapot).toBe("ACCEPTED");
    expect(rekord.igazolasHash).not.toHaveLength(43);
    const verifyToken = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).text.match(/\/hirlevel\/igazolas\?token=([A-Za-z0-9_-]{43})/)?.[1] ?? "";
    expect(verifyToken).toHaveLength(43);
    expect(await igazolHirlevelFeliratkozast(verifyToken)).toBe(true);
    expect(await igazolHirlevelFeliratkozast(verifyToken)).toBe(false);
    expect(await frissitHirlevelKuldesAllapotot("message_hirlevel_123", "DELIVERED")).toBe(true);
    expect(await leiratkozikHirlevelrol("invalid-token" )).toBe(false);
  });

  it("a visszaigazolt feliratkozás egyszer használatos hivatkozással letiltható", async () => {
    const { feliratkozikHirlevelre } = await import("./hirlevel");
    await feliratkozikHirlevelre(email, true);
    const body = String(fetchMock.mock.calls.at(-1)?.[1]?.body);
    const unsubscribeToken = JSON.parse(body).text.match(/\/hirlevel\/leiratkozas\?token=([A-Za-z0-9_-]{43})/)?.[1] ?? "";
    expect(await leiratkozikHirlevelrol(unsubscribeToken)).toBe(true);
    expect(await leiratkozikHirlevelrol(unsubscribeToken)).toBe(false);
    expect(await frissitHirlevelKuldesAllapotot("message_hirlevel_123", "BOUNCED")).toBe(false);
    expect((await prisma.hirlevelFeliratkozas.findUniqueOrThrow({ where: { email } })).szolgaltatoiAllapot).toBe("UNSUBSCRIBED");
  });
});
