import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { takaritLejartKosarakat } from "@/kosar/lejart-kosar-takaritas";
import { KOSAR_SUTI } from "@/kosar/szerveres-kosar";
import { DELETE, GET, PATCH, POST } from "./route";
import { POST as ajanlatPOST } from "../penztar/ajanlat/route";

const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const engedelyezettAdatbazis = dbUrl !== null
  && ["localhost", "127.0.0.1", "::1"].includes(dbUrl.hostname)
  && dbUrl.pathname === "/hc_webaruhaz";

function keres(method: string, session?: string, body?: unknown) {
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (session) headers.set("cookie", `${KOSAR_SUTI}=${session}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest("http://localhost:3000/api/kosar", {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe.skipIf(!engedelyezettAdatbazis)("kosár API helyi PostgreSQL-adatbázissal", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("kosarat létrehoz, szerveráron újraáraz, szállítást tárol, majd törli a saját tesztadatait", async () => {
    const token = randomBytes(12).toString("hex");
    let session: string | undefined;
    const termek = await prisma.product.create({ data: {
      source: "unas",
      sourceId: `integracios-proba-${token}`,
      sku: `HC-INT-${token}`,
      slug: `integracios-proba-${token}`,
      name: "Integrációs próba termék",
      brand: "HC Home Fitness",
      category: "Teszt",
      description: "Automatikus integrációs tesztadat.",
      priceHuf: 123_456,
      isPublished: true,
      isTestFixture: false,
      isActive: true,
      isPurchasable: true,
      lastImportedAt: new Date(),
      keszlet: { create: { quantity: 3, fetchedAt: new Date() } },
    } });

    try {
      const get = await GET(keres("GET"));
      expect(get.status).toBe(200);
      expect(get.headers.get("set-cookie")).toContain("HttpOnly");
      expect(get.headers.get("cache-control")).toBe("private, no-store");
      session = get.headers.get("set-cookie")?.match(new RegExp(`${KOSAR_SUTI}=([^;]+)`))?.[1];
      expect(session).toBeTruthy();
      if (!session) throw new Error("A GET nem adott kosármunkamenet-sütit.");

      const elsoHozzaadas = await POST(keres("POST", session, { termekId: termek.id, verzio: 0 }));
      expect(elsoHozzaadas.status).toBe(200);
      expect(await elsoHozzaadas.json()).toMatchObject({ termekOsszegHuf: 123_456, tetelek: [{ mennyiseg: 1 }] });
      const masodikHozzaadas = await POST(keres("POST", session, { termekId: termek.id, verzio: 1 }));
      expect(masodikHozzaadas.status).toBe(200);
      expect(await masodikHozzaadas.json()).toMatchObject({ termekOsszegHuf: 246_912, fizetendoHuf: null, tetelek: [{ mennyiseg: 2 }] });
      const sessionHash = createHash("sha256").update(session).digest("hex");
      const adatbazisKosar = await prisma.kosar.findUnique({ where: { sessionHash } });
      expect(adatbazisKosar?.version).toBe(2);
      expect(adatbazisKosar?.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const szallitas = await PATCH(keres("PATCH", session, { szallitasiMod: "emeletre", verzio: 2 }));
      expect(szallitas.status, JSON.stringify(await szallitas.clone().json())).toBe(200);
      expect(await szallitas.json()).toMatchObject({ szallitasHuf: 19_900, fizetendoHuf: 266_812, szallitasiMod: "emeletre" });

      const ujraolvas = await GET(keres("GET", session));
      expect(await ujraolvas.json()).toMatchObject({ fizetendoHuf: 266_812, szallitasiMod: "emeletre" });

      const ajanlatValasz = await ajanlatPOST(keres("POST", session, { verzio: 3 }));
      expect(ajanlatValasz.status).toBe(200);
      const ajanlat = await ajanlatValasz.json();
      expect(ajanlat).toMatchObject({ cartVersion: 3, termekOsszegHuf: 246_912, szallitasHuf: 19_900, fizetendoHuf: 266_812, arSzabalyVerzio: 1, fizetesEngedelyezett: false });
      expect(Date.parse(ajanlat.expiresAt) - Date.now()).toBeGreaterThan(9 * 60_000);
      expect(Date.parse(ajanlat.expiresAt) - Date.now()).toBeLessThanOrEqual(10 * 60_000);
      const ajanlatHash = createHash("sha256").update(ajanlat.token).digest("hex");
      const elmentettAjanlat = await prisma.checkoutQuote.findUnique({ where: { tokenHash: ajanlatHash } });
      expect(elmentettAjanlat).toMatchObject({ cartVersion: 3, termekOsszegHuf: 246_912, szallitasHuf: 19_900, fizetendoHuf: 266_812 });
      expect(elmentettAjanlat?.itemSnapshots).toMatchObject([{ egysegarHuf: 123_456, sorOsszegHuf: 246_912 }]);

      await prisma.productStock.update({ where: { productId: termek.id }, data: { fetchedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } });
      const elavultKeszlettelHozzaadas = await POST(keres("POST", session, { termekId: termek.id, verzio: 3 }));
      expect(elavultKeszlettelHozzaadas.status).toBe(409);
      expect(await elavultKeszlettelHozzaadas.json()).toMatchObject({ kod: "NEM_VASAROLHATO" });

      await prisma.product.update({ where: { id: termek.id }, data: { lastImportedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } });
      const elavultAjanlat = await ajanlatPOST(keres("POST", session, { verzio: 3 }));
      expect(elavultAjanlat.status).toBe(503);
      expect(await elavultAjanlat.json()).toMatchObject({ kod: "FORRAS_ADAT_ELAVULT" });

      await prisma.product.update({ where: { id: termek.id }, data: { priceHuf: 150_000 } });
      expect((await prisma.checkoutQuote.findUnique({ where: { tokenHash: ajanlatHash } }))?.fizetendoHuf).toBe(266_812);

      const torles = await DELETE(keres("DELETE", session, { termekId: termek.id, verzio: 3 }));
      expect(torles.status).toBe(200);
      expect(await torles.json()).toMatchObject({ tetelek: [], fizetendoHuf: null });

      const lejartIdopont = new Date(Date.now() - 1_000);
      await prisma.checkoutQuote.update({ where: { tokenHash: ajanlatHash }, data: { expiresAt: lejartIdopont } });
      const ajanlatTakaritas = await takaritLejartKosarakat();
      expect(ajanlatTakaritas.toroltAjanlatok).toBeGreaterThanOrEqual(1);
      expect(ajanlatTakaritas.toroltKosarak).toBeGreaterThanOrEqual(0);
      expect(await prisma.checkoutQuote.findUnique({ where: { tokenHash: ajanlatHash } })).toBeNull();

      await prisma.kosar.update({ where: { sessionHash }, data: { expiresAt: lejartIdopont } });
      const kosarTakaritas = await takaritLejartKosarakat();
      expect(kosarTakaritas.toroltKosarak).toBeGreaterThanOrEqual(1);
      expect(await prisma.kosar.findUnique({ where: { sessionHash } })).toBeNull();
    } finally {
      await prisma.kosarTetel.deleteMany({ where: { termekId: termek.id } });
      if (session) {
        const sessionHash = createHash("sha256").update(session).digest("hex");
        await prisma.checkoutQuote.deleteMany({ where: { kosar: { sessionHash } } });
        await prisma.kosar.deleteMany({ where: { sessionHash } });
        const [kosarDarab, tetelDarab] = await Promise.all([
          prisma.kosar.count({ where: { sessionHash } }),
          prisma.kosarTetel.count({ where: { termekId: termek.id } }),
        ]);
        expect(kosarDarab).toBe(0);
        expect(tetelDarab).toBe(0);
      }
      await prisma.product.delete({ where: { id: termek.id } });
      expect(await prisma.product.count({ where: { id: termek.id } })).toBe(0);
    }
  }, 30_000);
});
