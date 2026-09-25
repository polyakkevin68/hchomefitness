import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { rogzitRendelesiIgenyt } from "@/rendeles/szerveres-rendeles";
import { KuponHiba, keszitAjanlatot } from "./szerveres-ajanlat";

const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const helyiAdatbazis = dbUrl !== null && ["localhost", "127.0.0.1", "::1"].includes(dbUrl.hostname) && dbUrl.pathname === "/hc_webaruhaz";
function hash(ertek: string) { return createHash("sha256").update(ertek).digest("hex"); }

describe.skipIf(!helyiAdatbazis)("kuponos ajánlat és rendelés PostgreSQL-en", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("tranzakciósan foglalja a keretet, majd a létrejött rendelésnél felhasználja a kedvezményt", async () => {
    const id = randomBytes(8).toString("hex");
    const code = `HC${id.slice(0, 8).toUpperCase()}`;
    const sessions = [randomBytes(32).toString("base64url"), randomBytes(32).toString("base64url")];
    const product = await prisma.product.create({ data: {
      source: "unas", sourceId: `kupon-${id}`, sku: `HC-KUP-${id}`, slug: `kupon-proba-${id}`,
      name: "Kupon próba termék", brand: "HC Home Fitness", category: `Teszt-${id}`, priceHuf: 100_000,
      isPublished: true, isTestFixture: false, isActive: true, isPurchasable: true, lastImportedAt: new Date(),
    } });
    const carts = await Promise.all(sessions.map((session) => prisma.kosar.create({ data: {
      sessionHash: hash(session), version: 0, szallitasiMod: "hazhoz", expiresAt: new Date(Date.now() + 15 * 60_000),
      tetelek: { create: { termekId: product.id, mennyiseg: 1 } },
    } })));
    const kupon = await prisma.kupon.create({ data: {
      kod: code, tipus: "SZAZALEK", ertek: 10, minimumHuf: 0, maximumHuf: null,
      indulAt: new Date(Date.now() - 60_000), lejarAt: new Date(Date.now() + 60 * 60_000),
      felhasznalasiKeret: 1, aktiv: true, osszevonhato: false, kategoriak: [product.category],
    } });
    const orderIds: string[] = [];
    try {
      const quote = await keszitAjanlatot(sessions[0], 0, code.toLowerCase());
      expect(quote).toMatchObject({ kuponKod: code, kedvezmenyHuf: 10_000, fizetendoHuf: 90_000 });
      await expect(keszitAjanlatot(sessions[1], 0, code)).rejects.toBeInstanceOf(KuponHiba);
      const order = await rogzitRendelesiIgenyt(sessions[0], {
        ajanlatToken: quote.token,
        idempotenciaKulcs: `kupon-${id}`,
        vevo: { nev: "Kupon Teszt", email: `kupon-${id}@example.test`, telefon: "+36301234567" },
        szallitasiCim: { orszag: "HU", iranyitoszam: "1111", telepules: "Budapest", cim: "Kupon utca 1." },
      });
      orderIds.push(order.rendeles.id);
      const savedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.rendeles.id } });
      expect(savedOrder).toMatchObject({ totalHuf: 90_000, discountHuf: 10_000, couponCode: code });
      expect(await prisma.kuponFelhasznalas.findUnique({ where: { checkoutQuoteId: quote.id } })).toMatchObject({ allapot: "USED", kedvezmenyHuf: 10_000, orderId: order.rendeles.id });
      await expect(keszitAjanlatot(sessions[1], 0, code)).rejects.toBeInstanceOf(KuponHiba);
    } finally {
      await prisma.notification.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.kosar.deleteMany({ where: { id: { in: carts.map((cart) => cart.id) } } });
      await prisma.kupon.delete({ where: { id: kupon.id } });
      await prisma.product.delete({ where: { id: product.id } });
    }
  });
});
