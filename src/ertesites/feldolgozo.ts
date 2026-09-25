import "server-only";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { MailerSendHiba, letrehozMailerSendAdapter } from "./mailer-send-kapcsolat";
import { keszitTranzakciosUzenetet } from "./uzenetsablonok";
import { keszitSzamlaHivatkozast } from "@/szamlazas/vedett-dokumentum";
import { frissitHirlevelKuldesAllapotot } from "./hirlevel";

export async function sorbaAllitErtesitest(tx: Pick<typeof prisma, "notification">, orderId: string, type: string, dedupeKey: string) {
  return tx.notification.upsert({ where: { dedupeKey }, create: { orderId, type, dedupeKey }, update: {} });
}

export function osztalyozErtesitesiHibat(hiba: unknown, szolgaltatoElfogadta: boolean) {
  if (szolgaltatoElfogadta) return { allapot: "UNKNOWN" as const, kod: "STATUSZ_MENTES_HIBA" };
  if (hiba instanceof MailerSendHiba && hiba.eredmeny === "BIZONYTALAN") return { allapot: "UNKNOWN" as const, kod: hiba.kod };
  return { allapot: "FAILED" as const, kod: hiba instanceof MailerSendHiba ? hiba.kod : "SABLON_HIBA" };
}

function adapterKonfiguracio() {
  const config = readAppConfig();
  if (config.MAILERSEND_PROVIDER !== "mailersend" || !config.MAILERSEND_API_KEY || !config.MAILERSEND_FROM_EMAIL || !config.MAILERSEND_FROM_NAME) return null;
  return letrehozMailerSendAdapter({
    apiKulcs: config.MAILERSEND_API_KEY,
    feladoEmail: config.MAILERSEND_FROM_EMAIL,
    feladoNev: config.MAILERSEND_FROM_NAME,
    mod: config.MAILERSEND_MODE,
    kornyezet: config.APP_ENV,
    engedelyezettCimek: (config.MAILERSEND_ALLOWED_RECIPIENTS ?? "").split(","),
  });
}

export async function feldolgozTranzakciosErtesiteseket() {
  const config = readAppConfig();
  const adapter = adapterKonfiguracio();
  if (!adapter) return { feldolgozott: 0, allapot: "DISABLED" as const };
  const regiek = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.notification.updateMany({ where: { state: "PROCESSING", updatedAt: { lt: regiek } }, data: { state: "UNKNOWN", lastError: "WORKER_LEALLT_KULDES_KOZBEN" } });
  const pending = await prisma.notification.findMany({ where: { state: "PENDING" }, orderBy: { createdAt: "asc" }, take: 20, select: { id: true } });
  let feldolgozott = 0;
  for (const { id } of pending) {
    const claim = await prisma.notification.updateMany({ where: { id, state: "PENDING" }, data: { state: "PROCESSING", attempts: { increment: 1 }, lastError: null } });
    if (claim.count !== 1) continue;
    const notification = await prisma.notification.findUnique({ where: { id }, include: { order: { include: { shipment: true, invoices: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, invoiceNumber: true } }, paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1, include: { refunds: { where: { state: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, take: 1, select: { amountHuf: true } } } } } } } });
    if (!notification) continue;
    let szolgaltatoElfogadta = false;
    try {
      const message = keszitTranzakciosUzenetet({
        publicId: notification.order.publicId,
        customerName: notification.order.customerName,
        customerEmail: notification.order.customerEmail,
        totalHuf: notification.order.totalHuf,
        paymentState: notification.order.paymentState,
        status: notification.order.status,
        notificationType: notification.type,
        carrier: notification.order.shipment?.carrier,
        trackingNumber: notification.order.shipment?.trackingNumber,
        trackingUrl: notification.order.shipment?.trackingUrl,
        invoiceNumber: notification.order.invoices[0]?.invoiceNumber,
        refundAmountHuf: notification.order.paymentAttempts[0]?.refunds[0]?.amountHuf,
        itemSnapshots: notification.order.itemSnapshots,
        invoiceUrl: notification.type === "INVOICE_ISSUED" && notification.order.invoices[0]
          ? keszitSzamlaHivatkozast(notification.order.invoices[0].id, { titok: config.INVOICE_ACCESS_SECRET, alapUrl: config.PUBLIC_BASE_URL })
          : null,
      });
      const result = await adapter.kuld({ ...message, cimzettEmail: notification.order.customerEmail, cimzettNev: notification.order.customerName, ertesitesAzonosito: notification.id });
      szolgaltatoElfogadta = true;
      await prisma.notification.update({ where: { id }, data: { state: "SENT", providerMessageId: result.uzenetId, sentAt: new Date(), lastError: null } });
    } catch (hiba) {
      const eredmeny = osztalyozErtesitesiHibat(hiba, szolgaltatoElfogadta);
      await prisma.notification.update({ where: { id }, data: { state: eredmeny.allapot, lastError: eredmeny.kod } });
    }
    feldolgozott += 1;
  }
  return { feldolgozott, allapot: "ENABLED" as const };
}

export async function fogadMailerSendWebhook(rawBody: string, signature: string | null) {
  const config = readAppConfig();
  if (config.MAILERSEND_PROVIDER !== "mailersend" || !config.MAILERSEND_WEBHOOK_SECRET || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const received = Buffer.from(signature, "hex");
  const expected = createHmac("sha256", config.MAILERSEND_WEBHOOK_SECRET).update(rawBody, "utf8").digest();
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  let event: unknown;
  try { event = JSON.parse(rawBody); } catch { return false; }
  if (!event || typeof event !== "object") return false;
  const root = event as { type?: unknown; data?: { message_id?: unknown } };
  if (typeof root.type !== "string" || typeof root.data?.message_id !== "string") return false;
  const notification = await prisma.notification.findFirst({ where: { providerMessageId: root.data.message_id } });
  if (!notification) {
    if (root.type === "activity.delivered") return frissitHirlevelKuldesAllapotot(root.data.message_id, "DELIVERED");
    if (["activity.hard_bounced", "activity.soft_bounced", "activity.suppressed"].includes(root.type)) return frissitHirlevelKuldesAllapotot(root.data.message_id, "BOUNCED");
    return false;
  }
  if (root.type === "activity.delivered") await prisma.notification.update({ where: { id: notification.id }, data: { state: "DELIVERED", lastError: null } });
  else if (["activity.hard_bounced", "activity.soft_bounced", "activity.suppressed"].includes(root.type) && notification.state !== "DELIVERED") {
    await prisma.notification.update({ where: { id: notification.id }, data: { state: "BOUNCED", lastError: root.type.slice("activity.".length).toUpperCase() } });
  }
  return true;
}
