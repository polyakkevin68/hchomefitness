import "dotenv/config";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { frissitHelyiSzallitmanyt } from "./szerveres-teljesites";
import { listazKezelendoRendeleseket } from "./szerveres-rendeles";

const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const helyiAdatbazis = dbUrl !== null && ["localhost", "127.0.0.1", "::1"].includes(dbUrl.hostname)
  && dbUrl.pathname === "/hc_webaruhaz";

describe.skipIf(!helyiAdatbazis)("helyi teljesítési adatbázis", () => {
  beforeAll(async () => {
    await prisma.adminUser.deleteMany({ where: { email: { startsWith: "teljesites-" } } });
    await prisma.product.deleteMany({ where: { sku: { startsWith: "HC-TEL-" } } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("naplózza az előkészítést, feladást és kézbesítést, az értesítést pedig csak egyszer sorolja be", async () => {
    const azonosito = randomBytes(8).toString("hex");
    const admin = await prisma.adminUser.create({ data: {
      email: `teljesites-${azonosito}@example.test`,
      passwordHash: "teszt-hash",
      role: "OPERATIONS",
    } });
    const product = await prisma.product.create({ data: {
      source: "unas", sourceId: `teljesites-${azonosito}`, sku: `HC-TEL-${azonosito}`,
      slug: `teljesites-${azonosito}`, name: "Teljesítési próba", brand: "HC Home Fitness",
      category: "Teszt", description: "", priceHuf: 25_000, isPublished: false,
      isTestFixture: true, isActive: true, isPurchasable: false,
    } });
    let order;
    try {
      order = await prisma.order.create({ data: {
      publicId: `HC-20260925-${randomBytes(6).toString("hex").toUpperCase()}`,
      sessionHash: randomBytes(32).toString("hex"), idempotencyKey: `teljesites-${azonosito}`,
      status: "CONFIRMED", customerName: "Próba Vevő", customerEmail: "vevo@example.test",
      customerPhone: "+36301234567", addressSnapshot: {}, itemSnapshots: [{ sku: product.sku }],
      productTotalHuf: 25_000, shippingFeeHuf: 0, shippingMethod: "hazhoz", totalHuf: 25_000, currency: "HUF",
      privacyNoticeVersion: "teszt", salesTermsVersion: "teszt",
      } });
    } catch (hiba) {
      await prisma.adminUser.delete({ where: { id: admin.id } });
      await prisma.product.delete({ where: { id: product.id } });
      throw hiba;
    }
    try {
      const processing = await frissitHelyiSzallitmanyt(order.publicId, {
        allapot: "PROCESSING", futar: "", kovetesiSzam: "", idempotenciaKulcs: `start-${azonosito}`,
      }, admin.id);
      expect(processing.state).toBe("PROCESSING");
      const feladva = await frissitHelyiSzallitmanyt(order.publicId, {
        allapot: "SHIPPED", futar: "Minta Futár", kovetesiSzam: "KOV-12345",
        kovetesiUrl: "https://futar.example.test/KOV-12345", idempotenciaKulcs: `ship-${azonosito}`,
      }, admin.id);
      const ismetles = await frissitHelyiSzallitmanyt(order.publicId, {
        allapot: "SHIPPED", futar: "Minta Futár", kovetesiSzam: "KOV-12345",
        kovetesiUrl: "https://futar.example.test/KOV-12345", idempotenciaKulcs: `retry-${azonosito}`,
      }, admin.id);
      expect(ismetles.id).toBe(feladva.id);
      expect(await prisma.notification.count({ where: { orderId: order.id, type: "ORDER_SHIPPED" } })).toBe(1);
      expect(await prisma.adminAuditLog.count({ where: { adminUserId: admin.id, targetId: order.publicId } })).toBe(2);
      const kezbesitve = await frissitHelyiSzallitmanyt(order.publicId, {
        allapot: "DELIVERED", futar: "", kovetesiSzam: "", idempotenciaKulcs: `delivered-${azonosito}`,
      }, admin.id);
      expect(kezbesitve.state).toBe("DELIVERED");
      const adminLista = await listazKezelendoRendeleseket();
      const adminRendeles = adminLista.find((item) => item.publicId === order.publicId);
      expect(adminRendeles?.shipment?.state).toBe("DELIVERED");
      expect(adminRendeles?.events.map((event) => event.toStatus)).toEqual(["shipment_processing", "shipment_shipped", "shipment_delivered"]);
      await expect(frissitHelyiSzallitmanyt(order.publicId, {
        allapot: "PROCESSING", futar: "", kovetesiSzam: "", idempotenciaKulcs: `late-${azonosito}`,
      }, admin.id)).rejects.toThrow("időközben megváltozott");
    } finally {
      await prisma.notification.deleteMany({ where: { orderId: order.id } });
      await prisma.shipment.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      await prisma.adminAuditLog.deleteMany({ where: { adminUserId: admin.id } });
      await prisma.adminUser.delete({ where: { id: admin.id } });
      await prisma.product.delete({ where: { id: product.id } });
    }
  });
});
