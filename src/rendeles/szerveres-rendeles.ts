import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { forrasAdatFriss } from "@/penztar/forras-adat-frissesseg";
import { osszesitKosarat } from "@/penztar/osszegzes";
import { leptetRendelesAllapotot, type RendelesiAllapot } from "./allapot";

export type Cimtartalom = { orszag: "HU"; iranyitoszam: string; telepules: string; cim: string };
export type RendelesiIgenyBemenet = {
  ajanlatToken: string;
  idempotenciaKulcs: string;
  vevo: { nev: string; email: string; telefon: string };
  szallitasiCim: Cimtartalom;
  szamlazasiCim?: Cimtartalom;
};

type OrderReply = { rendeles: { id: string; publicId: string; status: string; totalHuf: number }; vendegToken: string };
type QuoteLine = { termekId: string; cikkszam: string; nev: string; mennyiseg: number; egysegarHuf: number; sorOsszegHuf: number };

export class RendelesHiba extends Error {
  constructor(message: string, readonly kod: "IDEMPOTENCIA_UTKOZES" | "AJANLAT_LEJART" | "AR_VALTOZOTT" | "NEM_VASAROLHATO" | "NEM_TALALHATO" | "RENDELES_ALLAPOT_UTKOZES" | "HIBAS_IGENY") {
    super(message);
    this.name = "RendelesHiba";
  }
}

function hash(ertek: string) { return createHash("sha256").update(ertek).digest("hex"); }

function guestToken(session: string, key: string) {
  return createHmac("sha256", session).update(`hc-order:${key}`).digest("base64url");
}

function valasz(order: { id: string; publicId: string; status: string; totalHuf: number }, token: string): OrderReply {
  return { rendeles: { id: order.id, publicId: order.publicId, status: order.status, totalHuf: order.totalHuf }, vendegToken: token };
}

function parseQuoteLines(snapshot: Prisma.JsonValue): QuoteLine[] | null {
  if (!Array.isArray(snapshot)) return null;
  const lines = snapshot.flatMap((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") return [];
    const item = value as Prisma.JsonObject;
    if (typeof item.termekId !== "string" || typeof item.cikkszam !== "string" || typeof item.nev !== "string"
      || typeof item.mennyiseg !== "number" || typeof item.egysegarHuf !== "number" || typeof item.sorOsszegHuf !== "number") return [];
    return [{ termekId: item.termekId, cikkszam: item.cikkszam, nev: item.nev, mennyiseg: item.mennyiseg, egysegarHuf: item.egysegarHuf, sorOsszegHuf: item.sorOsszegHuf }];
  });
  return lines.length === snapshot.length ? lines : null;
}

function publicOrderId(now: Date) {
  const day = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `HC-${day}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function rogzitRendelesiIgenyt(session: string, input: RendelesiIgenyBemenet): Promise<OrderReply> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(session)) throw new RendelesHiba("A kosár munkamenete nem érvényes.", "HIBAS_IGENY");
  const sessionHash = hash(session);
  const requestHash = hash(JSON.stringify({
    ajanlatToken: input.ajanlatToken,
    vevo: input.vevo,
    szallitasiCim: input.szallitasiCim,
    szamlazasiCim: input.szamlazasiCim ?? input.szallitasiCim,
  }));
  const accessToken = guestToken(session, input.idempotenciaKulcs);
  const now = new Date();
  const config = readAppConfig();

  const meglevo = await prisma.order.findUnique({ where: { sessionHash_idempotencyKey: { sessionHash, idempotencyKey: input.idempotenciaKulcs } } });
  if (meglevo) {
    if (meglevo.requestHash !== requestHash) throw new RendelesHiba("Ezt a rendelési kulcsot már eltérő adatokkal használtad.", "IDEMPOTENCIA_UTKOZES");
    return valasz(meglevo, accessToken);
  }

  const quoteTokenHash = hash(input.ajanlatToken);
  const arKorhatar = config.PRICE_MAX_AGE_SECONDS;
  let newOrder;
  try {
  newOrder = await prisma.$transaction(async (tx) => {
    const quote = await tx.checkoutQuote.findUnique({
      where: { tokenHash: quoteTokenHash },
      include: { kosar: { include: { tetelek: { include: { termek: { include: { keszlet: true } } }, orderBy: { createdAt: "asc" } } } } },
    });
    if (!quote || quote.expiresAt <= now || quote.kosar.expiresAt <= now) {
      throw new RendelesHiba("Az ajánlat lejárt. Készíts új ajánlatot.", "AJANLAT_LEJART");
    }
    if (quote.kosar.sessionHash !== sessionHash || quote.cartVersion !== quote.kosar.version
      || (quote.kosar.szallitasiMod !== "hazhoz" && quote.kosar.szallitasiMod !== "emeletre")) {
      throw new RendelesHiba("A kosár megváltozott. Ellenőrizd újra a tételeket.", "AR_VALTOZOTT");
    }
    if (quote.kosar.tetelek.length < 1) throw new RendelesHiba("Az üres kosárból nem készülhet rendelési igény.", "HIBAS_IGENY");

    const quoteLines = parseQuoteLines(quote.itemSnapshots);
    if (!quoteLines || quoteLines.length !== quote.kosar.tetelek.length) throw new RendelesHiba("Az ajánlat tételadatai nem érvényesek.", "AR_VALTOZOTT");
    const inputLines = quote.kosar.tetelek.map(({ termek, mennyiseg }) => ({ termekId: termek.id, mennyiseg }));
    const currentProducts = quote.kosar.tetelek.map(({ termek }) => ({
      id: termek.id, sku: termek.sku, nev: termek.name, marka: termek.brand, forras: termek.source, arHuf: termek.priceHuf,
      aktiv: termek.isActive, kozzetett: termek.isPublished, vasarolhato: termek.isPurchasable, probaAdat: termek.isTestFixture,
    }));
    let osszeg;
    try { osszeg = osszesitKosarat(inputLines, currentProducts, quote.kosar.szallitasiMod); }
    catch { throw new RendelesHiba("A kosár egyik terméke már nem vásárolható.", "NEM_VASAROLHATO"); }

    const hasChanged = quoteLines.some((line, index) => {
      const current = quote.kosar.tetelek[index];
      return !current || line.termekId !== current.termek.id || line.cikkszam !== current.termek.sku
        || line.nev !== current.termek.name || line.mennyiseg !== current.mennyiseg || line.egysegarHuf !== current.termek.priceHuf
        || !forrasAdatFriss(current.termek.lastImportedAt, arKorhatar, now);
    });
    if (hasChanged || quote.termekOsszegHuf !== osszeg.termekOsszegHuf
      || quote.szallitasHuf !== osszeg.szallitasHuf || quote.fizetendoHuf !== osszeg.fizetendoHuf) {
      throw new RendelesHiba("Az ár vagy a kosár megváltozott. Kérj új ajánlatot.", "AR_VALTOZOTT");
    }

    const itemSnapshots = quote.kosar.tetelek.map(({ termek, mennyiseg }, index) => ({
      termekId: termek.id,
      cikkszam: termek.sku,
      nev: termek.name,
      mennyiseg,
      egysegarHuf: termek.priceHuf,
      sorOsszegHuf: termek.priceHuf * mennyiseg,
      forrasAdatIdeje: termek.lastImportedAt?.toISOString() ?? null,
      keszletMennyiseg: termek.keszlet?.quantity ?? null,
      keszletLekerveAt: termek.keszlet?.fetchedAt.toISOString() ?? null,
      keszletFriss: forrasAdatFriss(termek.keszlet?.fetchedAt ?? null, config.STOCK_MAX_AGE_SECONDS, now),
      ajanlatTetel: quoteLines[index],
    }));
    const addressSnapshot = {
      vevo: input.vevo,
      szallitasiCim: input.szallitasiCim,
      szamlazasiCim: input.szamlazasiCim ?? input.szallitasiCim,
    };
    const order = await tx.order.create({
      data: {
        publicId: publicOrderId(now),
        status: "PENDING_CONFIRMATION",
        paymentState: "UNPAID",
        currency: "HUF",
        productTotalHuf: quote.termekOsszegHuf,
        shippingFeeHuf: quote.szallitasHuf,
        shippingMethod: quote.szallitasiMod,
        totalHuf: quote.fizetendoHuf,
        customerName: input.vevo.nev,
        customerEmail: input.vevo.email,
        customerPhone: input.vevo.telefon,
        addressSnapshot,
        itemSnapshots,
        sourceQuoteId: quote.id,
        privacyNoticeVersion: config.ORDER_PRIVACY_NOTICE_VERSION ?? null,
        salesTermsVersion: config.ORDER_SALES_TERMS_VERSION ?? null,
        sessionHash,
        guestAccessHash: hash(accessToken),
        requestHash,
        idempotencyKey: input.idempotenciaKulcs,
        events: { create: { fromStatus: null, toStatus: "PENDING_CONFIRMATION", actor: "CUSTOMER", note: "Készlet-visszaigazolási igény érkezett." } },
      },
      select: { id: true, publicId: true, status: true, totalHuf: true },
    });
    return order;
  }, { maxWait: 5_000, timeout: 10_000 });
  } catch (hiba) {
    if (hiba instanceof Prisma.PrismaClientKnownRequestError && hiba.code === "P2002") {
      const parhuzamos = await prisma.order.findUnique({ where: { sessionHash_idempotencyKey: { sessionHash, idempotencyKey: input.idempotenciaKulcs } } });
      if (parhuzamos) {
        if (parhuzamos.requestHash !== requestHash) throw new RendelesHiba("Ezt a rendelési kulcsot már eltérő adatokkal használtad.", "IDEMPOTENCIA_UTKOZES");
        return valasz(parhuzamos, accessToken);
      }
    }
    throw hiba;
  }

  return valasz(newOrder, accessToken);
}

export async function lekerVendegRendelest(publicId: string, accessToken: string) {
  const order = await prisma.order.findFirst({
    where: { publicId, guestAccessHash: hash(accessToken) },
    select: { publicId: true, status: true, paymentState: true, currency: true, productTotalHuf: true, shippingFeeHuf: true, shippingMethod: true, totalHuf: true, customerName: true, customerEmail: true, customerPhone: true, addressSnapshot: true, itemSnapshots: true, createdAt: true, stockConfirmationNote: true, stockConfirmedAt: true },
  });
  if (!order) throw new RendelesHiba("A rendelés nem található.", "NEM_TALALHATO");
  const address = order.addressSnapshot as { szallitasiCim?: Cimtartalom };
  return {
    publicId: order.publicId,
    status: order.status,
    paymentState: order.paymentState,
    currency: order.currency,
    termekOsszegHuf: order.productTotalHuf,
    szallitasHuf: order.shippingFeeHuf,
    szallitasiMod: order.shippingMethod,
    totalHuf: order.totalHuf,
    vevo: { nev: order.customerName, email: order.customerEmail, telefon: order.customerPhone },
    szallitasiCim: address.szallitasiCim,
    tetelek: order.itemSnapshots,
    letrehozvaAt: order.createdAt.toISOString(),
    keszletAllapot: order.status,
    keszletUzenet: order.status === "PENDING_CONFIRMATION" ? "A készlet kézi ellenőrzése folyamatban van." : order.status === "CONFIRMED" ? "A készletet visszaigazolták; a fizetés még nincs bekapcsolva." : "A termék jelenleg nem elérhető; ügyfélszolgálatunk egyeztet veled.",
    keszletMegerositveAt: order.stockConfirmedAt?.toISOString() ?? null,
  };
}

export async function listazKezelendoRendeleseket() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PENDING_CONFIRMATION", "CONFIRMED"] } },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, publicId: true, status: true, customerName: true, customerEmail: true, customerPhone: true, addressSnapshot: true, itemSnapshots: true, productTotalHuf: true, shippingFeeHuf: true, shippingMethod: true, totalHuf: true, createdAt: true, shipment: true },
  });
  return orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() }));
}

export async function megerositRendelesiKeszletet(publicId: string, muvelet: "megerosit" | "elutasit", megjegyzes: string, actor: "ORDER_OPERATIONS", adminUserId?: string) {
  const kovetkezo: RendelesiAllapot = muvelet === "megerosit" ? "CONFIRMED" : "REJECTED";
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { publicId } });
    if (!order) throw new RendelesHiba("A rendelés nem található.", "NEM_TALALHATO");
    if (order.status === kovetkezo && order.stockConfirmationNote === megjegyzes) return { id: order.id, publicId, status: order.status };
    try { leptetRendelesAllapotot(order.status as RendelesiAllapot, kovetkezo); }
    catch { throw new RendelesHiba("A rendelés készletállapotát már rögzítették.", "RENDELES_ALLAPOT_UTKOZES"); }
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING_CONFIRMATION" },
      data: {
        status: kovetkezo,
        stockConfirmationNote: megjegyzes,
        stockConfirmedAt: muvelet === "megerosit" ? new Date() : null,
      },
    });
    if (updated.count !== 1) throw new RendelesHiba("A rendelés állapota időközben megváltozott.", "RENDELES_ALLAPOT_UTKOZES");
    await tx.orderEvent.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: kovetkezo, actor, note: megjegyzes } });
    if (adminUserId) await tx.adminAuditLog.create({ data: { adminUserId, action: `stock_${muvelet}`, targetType: "Order", targetId: publicId, details: { megjegyzes } } });
    return { id: order.id, publicId, status: kovetkezo };
  }, { maxWait: 5_000, timeout: 10_000 });
}
