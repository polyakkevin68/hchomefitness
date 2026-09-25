import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { lekerVendegRendelest, megerositRendelesiKeszletet, RendelesHiba, rogzitRendelesiIgenyt } from "./szerveres-rendeles";

const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const helyiAdatbazis = dbUrl !== null && ["localhost", "127.0.0.1", "::1"].includes(dbUrl.hostname)
  && dbUrl.pathname === "/hc_webaruhaz";

function hash(ertek: string) { return createHash("sha256").update(ertek).digest("hex"); }

async function letrehozProba(token: string) {
  const session = randomBytes(32).toString("base64url");
  const termek = await prisma.product.create({ data: {
    source: "unas", sourceId: `rendeles-${token}`, sku: `HC-REN-${token}`, slug: `rendeles-${token}`,
    name: "Rendelési próba termék", brand: "HC Home Fitness", category: "Teszt", description: "",
    priceHuf: 123_456, isPublished: true, isTestFixture: false, isActive: true, isPurchasable: true,
    lastImportedAt: new Date(),
  } });
  const kosar = await prisma.kosar.create({ data: {
    sessionHash: hash(session), version: 1, szallitasiMod: "hazhoz", expiresAt: new Date(Date.now() + 60_000),
    tetelek: { create: { termekId: termek.id, mennyiseg: 1 } },
  } });
  const ajanlatToken = randomBytes(32).toString("base64url");
  const ajanlat = await prisma.checkoutQuote.create({ data: {
    tokenHash: hash(ajanlatToken), kosarId: kosar.id, cartVersion: 1,
    itemSnapshots: [{ termekId: termek.id, cikkszam: termek.sku, nev: termek.name, mennyiseg: 1, egysegarHuf: termek.priceHuf, sorOsszegHuf: termek.priceHuf }],
    szallitasiMod: "hazhoz", termekOsszegHuf: termek.priceHuf, szallitasHuf: 0,
    fizetendoHuf: termek.priceHuf, arSzabalyVerzio: 1, expiresAt: new Date(Date.now() + 10 * 60_000),
  } });
  await prisma.productStock.create({ data: { productId: termek.id, quantity: 4, fetchedAt: new Date() } });
  return { session, termek, ajanlat, ajanlatToken, kosar, publicIds: [] as string[] };
}

const igeny = (ajanlatToken: string, idempotenciaKulcs = "rendeles-proba-1") => ({
  ajanlatToken,
  idempotenciaKulcs,
  vevo: { nev: "Minta Vásárló", email: "vasarlo@example.test", telefon: "+36301234567" },
  szallitasiCim: { orszag: "HU" as const, iranyitoszam: "1011", telepules: "Budapest", cim: "Teszt utca 1." },
});

describe.skipIf(!helyiAdatbazis)("kézi készletmegerősítéses rendelési igény PostgreSQL-en", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("azonos kérést egyszer rögzít, és a módosított ár mellett is azonos eredményt ad", async () => {
    const proba = await letrehozProba(randomBytes(8).toString("hex"));
    try {
      const adat = igeny(proba.ajanlatToken);
      const elso = await rogzitRendelesiIgenyt(proba.session, adat);
      proba.publicIds.push(elso.rendeles.publicId);
      await prisma.product.update({ where: { id: proba.termek.id }, data: { name: "Átírt név", priceHuf: 999_999 } });
      const ismetelt = await rogzitRendelesiIgenyt(proba.session, adat);
      expect(ismetelt.rendeles.id).toBe(elso.rendeles.id);
      expect(ismetelt.rendeles.status).toBe("PENDING_CONFIRMATION");
      expect(ismetelt.rendeles.totalHuf).toBe(123_456);
      expect(ismetelt.vendegToken).toBe(elso.vendegToken);
      expect(await prisma.order.count({ where: { sessionHash: hash(proba.session), idempotencyKey: adat.idempotenciaKulcs } })).toBe(1);
      const mentettRendeles = await prisma.order.findUnique({ where: { id: elso.rendeles.id } });
      expect(mentettRendeles?.privacyNoticeVersion).toBe("helyi-fejlesztes");
      expect(mentettRendeles?.salesTermsVersion).toBe("helyi-fejlesztes");
      const vendegNezet = await lekerVendegRendelest(elso.rendeles.publicId, elso.vendegToken);
      expect(vendegNezet.tetelek).toMatchObject([{ nev: "Rendelési próba termék", egysegarHuf: 123_456 }]);
      expect(vendegNezet.keszletAllapot).toBe("PENDING_CONFIRMATION");
      await expect(lekerVendegRendelest(elso.rendeles.publicId, "idegen-token"))
        .rejects.toMatchObject({ kod: "NEM_TALALHATO" });
    } finally { await takaritRendelesiProbat(proba); }
  });

  it("azonos kulcs eltérő adatokkal ütközik, más kosármunkamenetben pedig külön rendelés lehet", async () => {
    const elsoProba = await letrehozProba(randomBytes(8).toString("hex"));
    const masodikProba = await letrehozProba(randomBytes(8).toString("hex"));
    try {
      const adat = igeny(elsoProba.ajanlatToken, "kozos-kulcs");
      const elso = await rogzitRendelesiIgenyt(elsoProba.session, adat);
      elsoProba.publicIds.push(elso.rendeles.publicId);
      await expect(rogzitRendelesiIgenyt(elsoProba.session, { ...adat, vevo: { ...adat.vevo, email: "masik@example.test" } }))
        .rejects.toMatchObject({ kod: "IDEMPOTENCIA_UTKOZES" });
      const masik = await rogzitRendelesiIgenyt(masodikProba.session, igeny(masodikProba.ajanlatToken, "kozos-kulcs"));
      masodikProba.publicIds.push(masik.rendeles.publicId);
      expect(masik.rendeles.id).not.toBe(elso.rendeles.id);
    } finally {
      await takaritRendelesiProbat(elsoProba);
      await takaritRendelesiProbat(masodikProba);
    }
  });

  it("párhuzamos azonos kérésekből is csak egy rendelést rögzít", async () => {
    const proba = await letrehozProba(randomBytes(8).toString("hex"));
    try {
      const adat = igeny(proba.ajanlatToken, "parhuzamos-proba-1");
      const eredmenyek = await Promise.all([
        rogzitRendelesiIgenyt(proba.session, adat),
        rogzitRendelesiIgenyt(proba.session, adat),
      ]);
      proba.publicIds.push(eredmenyek[0].rendeles.publicId);
      expect(eredmenyek[1].rendeles.id).toBe(eredmenyek[0].rendeles.id);
      expect(await prisma.order.count({ where: { sessionHash: hash(proba.session), idempotencyKey: adat.idempotenciaKulcs } })).toBe(1);
    } finally { await takaritRendelesiProbat(proba); }
  });

  it("lejárt ajánlatból nem rögzít rendelési igényt", async () => {
    const proba = await letrehozProba(randomBytes(8).toString("hex"));
    try {
      await prisma.checkoutQuote.update({ where: { id: proba.ajanlat.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await expect(rogzitRendelesiIgenyt(proba.session, igeny(proba.ajanlatToken)))
        .rejects.toBeInstanceOf(RendelesHiba);
      expect(await prisma.order.count({ where: { sessionHash: hash(proba.session) } })).toBe(0);
    } finally { await takaritRendelesiProbat(proba); }
  });

  it("a kézi készletdöntést egyszer rögzíti, és nem engedi megváltoztatni", async () => {
    const proba = await letrehozProba(randomBytes(8).toString("hex"));
    try {
      const igenyValasz = await rogzitRendelesiIgenyt(proba.session, igeny(proba.ajanlatToken));
      proba.publicIds.push(igenyValasz.rendeles.publicId);
      const elso = await megerositRendelesiKeszletet(igenyValasz.rendeles.publicId, "megerosit", "UNAS-ban ellenőrizve, 1 db félretéve", "ORDER_OPERATIONS");
      const ismetelt = await megerositRendelesiKeszletet(igenyValasz.rendeles.publicId, "megerosit", "UNAS-ban ellenőrizve, 1 db félretéve", "ORDER_OPERATIONS");
      expect(ismetelt.status).toBe("CONFIRMED");
      expect(ismetelt.id).toBe(elso.id);
      await expect(megerositRendelesiKeszletet(igenyValasz.rendeles.publicId, "elutasit", "Már nem elérhető készlet", "ORDER_OPERATIONS"))
        .rejects.toMatchObject({ kod: "RENDELES_ALLAPOT_UTKOZES" });
      expect(await prisma.orderEvent.count({ where: { orderId: elso.id } })).toBe(2);
    } finally { await takaritRendelesiProbat(proba); }
  });
});

async function takaritRendelesiProbat(proba: Awaited<ReturnType<typeof letrehozProba>>) {
  await prisma.order.deleteMany({ where: { publicId: { in: proba.publicIds } } });
  await prisma.checkoutQuote.deleteMany({ where: { id: proba.ajanlat.id } });
  await prisma.kosar.deleteMany({ where: { id: proba.kosar.id } });
  await prisma.product.delete({ where: { id: proba.termek.id } });
  expect(await prisma.order.count({ where: { publicId: { in: proba.publicIds } } })).toBe(0);
}
