import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { ellenorizKovetesiUrl, leptetTeljesitesiAllapotot, type TeljesitesiAllapot } from "./teljesites-allapot";

export class TeljesitesiHiba extends Error {
  constructor(message: string, readonly kod: "RENDELES_NEM_TALALHATO" | "KESZLET_NINCS_IGAZOLVA" | "ALLAPOT_UTKOZES" | "HIBAS_SZALLITASI_ADAT") {
    super(message);
    this.name = "TeljesitesiHiba";
  }
}

export async function frissitHelyiSzallitmanyt(
  publicId: string,
  bemenet: { allapot: Exclude<TeljesitesiAllapot, "PENDING">; futar: string; kovetesiSzam: string; kovetesiUrl?: string; idempotenciaKulcs: string },
  adminUserId: string,
) {
  if (!ellenorizKovetesiUrl(bemenet.kovetesiUrl)) throw new TeljesitesiHiba("A követési cím csak biztonságos HTTPS-hivatkozás lehet.", "HIBAS_SZALLITASI_ADAT");
  if (bemenet.allapot === "SHIPPED" && (bemenet.futar.trim().length < 2 || bemenet.kovetesiSzam.trim().length < 3)) {
    throw new TeljesitesiHiba("Feladáskor futárszolgálatot és követési számot kell megadni.", "HIBAS_SZALLITASI_ADAT");
  }
  const now = new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { publicId }, select: { id: true, publicId: true, status: true } });
      if (!order) throw new TeljesitesiHiba("A rendelés nem található.", "RENDELES_NEM_TALALHATO");
      if (order.status !== "CONFIRMED") throw new TeljesitesiHiba("A készletet előbb vissza kell igazolni.", "KESZLET_NINCS_IGAZOLVA");
      const shipment = await tx.shipment.findUnique({ where: { orderId: order.id } });
      const jelenlegi = (shipment?.state ?? "PENDING") as TeljesitesiAllapot;
      let ujAllapot: TeljesitesiAllapot;
      try { ujAllapot = leptetTeljesitesiAllapotot(jelenlegi, bemenet.allapot); }
      catch { throw new TeljesitesiHiba("A csomag állapota időközben megváltozott.", "ALLAPOT_UTKOZES"); }

      if (shipment && ujAllapot === jelenlegi
        && shipment.carrier === bemenet.futar && shipment.trackingNumber === bemenet.kovetesiSzam && shipment.trackingUrl === (bemenet.kovetesiUrl ?? null)) {
        return shipment;
      }
      const data = {
        state: ujAllapot,
        carrier: bemenet.futar || shipment?.carrier || null,
        trackingNumber: bemenet.kovetesiSzam || shipment?.trackingNumber || null,
        trackingUrl: bemenet.kovetesiUrl ?? shipment?.trackingUrl ?? null,
        shippedAt: ujAllapot === "SHIPPED" ? shipment?.shippedAt ?? now : shipment?.shippedAt ?? null,
        deliveredAt: ujAllapot === "DELIVERED" ? now : shipment?.deliveredAt ?? null,
      };
      const saved = shipment
        ? await tx.shipment.update({ where: { id: shipment.id }, data })
        : await tx.shipment.create({ data: { ...data, orderId: order.id, idempotencyKey: bemenet.idempotenciaKulcs } });

      if (ujAllapot !== jelenlegi) {
        await tx.adminAuditLog.create({
          data: { adminUserId, action: `shipment_${ujAllapot.toLowerCase()}`, targetType: "Order", targetId: publicId, details: { szallitmanyId: saved.id, futar: saved.carrier, kovetesiSzam: saved.trackingNumber } },
        });
      }
      if (ujAllapot === "SHIPPED" && jelenlegi !== "SHIPPED") {
        await tx.notification.upsert({
          where: { dedupeKey: `${publicId}:szallitas:${saved.id}` },
          create: { orderId: order.id, type: "ORDER_SHIPPED", dedupeKey: `${publicId}:szallitas:${saved.id}` },
          update: {},
        });
      }
      return saved;
    }, { maxWait: 5_000, timeout: 10_000 });
  } catch (hiba) {
    if (hiba instanceof Prisma.PrismaClientKnownRequestError && hiba.code === "P2002") {
      const order = await prisma.order.findUnique({ where: { publicId }, select: { id: true } });
      if (order) {
        const shipment = await prisma.shipment.findUnique({ where: { orderId: order.id } });
        if (shipment && shipment.state === bemenet.allapot && shipment.carrier === bemenet.futar && shipment.trackingNumber === bemenet.kovetesiSzam) return shipment;
      }
      throw new TeljesitesiHiba("A szállítási kérés ismétlődött vagy időközben megváltozott.", "ALLAPOT_UTKOZES");
    }
    throw hiba;
  }
}
