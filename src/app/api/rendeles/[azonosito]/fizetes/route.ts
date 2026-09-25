import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { letrehozSimplePayAdapter, SimplePayHiba } from "@/fizetes/simplepay-kapcsolat";
import { lekerVendegRendelest } from "@/rendeles/szerveres-rendeles";
import { sorbaAllitErtesitest } from "@/ertesites/feldolgozo";

export const dynamic = "force-dynamic";
type Kontextus = { params: Promise<{ azonosito: string }> };

function valasz(adat: unknown, status = 200) {
  const response = NextResponse.json(adat, { status });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function eredetHelyes(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

function adapter() {
  const config = readAppConfig();
  if (config.PAYMENT_PROVIDER !== "simplepay" || !config.SIMPLEPAY_MERCHANT_ID || !config.SIMPLEPAY_MERCHANT_KEY) return null;
  return letrehozSimplePayAdapter({ merchantId: config.SIMPLEPAY_MERCHANT_ID, merchantKey: config.SIMPLEPAY_MERCHANT_KEY, kornyezet: config.SIMPLEPAY_ENV });
}

function visszateresiCim(request: NextRequest, azonosito: string) {
  const config = readAppConfig();
  let origin: string;
  if (config.PUBLIC_BASE_URL) origin = new URL(config.PUBLIC_BASE_URL).origin;
  else if (config.SIMPLEPAY_ENV === "sandbox" && ["localhost", "127.0.0.1", "[::1]"].includes(request.nextUrl.hostname)) origin = request.nextUrl.origin;
  else throw new SimplePayHiba(false, "KONFIGURACIO");
  const url = new URL("/fizetes/visszateres", origin);
  url.searchParams.set("rendeles", azonosito);
  return url.href;
}

function szolgaltatoiAllapot(status: string): "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "UNKNOWN" {
  if (status === "FINISHED") return "SUCCEEDED";
  if (status === "TIMEOUT") return "EXPIRED";
  if (["CANCELLED", "NOTAUTHENTICATED", "NOTAUTHORIZED", "REVERSED", "INFRAUD"].includes(status)) return "FAILED";
  if (["INIT", "INAUTHENTICATION", "INPAYMENT", "AUTHORIZED"].includes(status)) return "PENDING";
  return "UNKNOWN";
}

async function vendegRendeles(request: NextRequest, azonosito: string) {
  if (!/^HC-\d{8}-[A-F0-9]{12}$/.test(azonosito)) return null;
  const token = request.cookies.get(`hc_rendeles_${azonosito}`)?.value;
  if (!token) return null;
  try { return await lekerVendegRendelest(azonosito, token); } catch { return null; }
}

export async function POST(request: NextRequest, context: Kontextus) {
  const { azonosito } = await context.params;
  if (!eredetHelyes(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const order = await vendegRendeles(request, azonosito);
  if (!order) return valasz({ hiba: "A rendelés nem található." }, 404);
  if (order.status !== "CONFIRMED" || order.paymentState === "PAID") return valasz({ hiba: "Ehhez a rendeléshez most nem indítható fizetés." }, 409);
  const pay = adapter();
  if (!pay) return valasz({ hiba: "Az online fizetés jelenleg nem érhető el." }, 503);

  let attempt = await prisma.paymentAttempt.findFirst({ where: { order: { publicId: azonosito } }, orderBy: { attemptNo: "asc" } });
  let ujInditas = false;
  if (!attempt) {
    try {
      const eredmeny = await prisma.$transaction(async (tx) => {
        const lockedOrder = await tx.order.findUnique({ where: { publicId: azonosito } });
        if (!lockedOrder || lockedOrder.status !== "CONFIRMED" || lockedOrder.paymentState === "PAID") throw new Error("ORDER_NOT_PAYABLE");
        const existing = await tx.paymentAttempt.findFirst({ where: { orderId: lockedOrder.id }, orderBy: { attemptNo: "asc" } });
        if (existing) return { attempt: existing, created: false };
        const created = await tx.paymentAttempt.create({ data: {
          orderId: lockedOrder.id, provider: "simplepay", merchantRef: `HC${randomBytes(12).toString("hex").toUpperCase()}`,
          state: "STARTING", amountHuf: lockedOrder.totalHuf, currency: lockedOrder.currency, attemptNo: 1, idempotencyKey: `simplepay-${lockedOrder.id}`,
        } });
        await tx.order.update({ where: { id: lockedOrder.id }, data: { paymentState: "PENDING" } });
        return { attempt: created, created: true };
      });
      attempt = eredmeny.attempt;
      ujInditas = eredmeny.created;
    } catch (error) {
      if (error instanceof Error && error.message === "ORDER_NOT_PAYABLE") return valasz({ hiba: "Ehhez a rendeléshez most nem indítható fizetés." }, 409);
      attempt = await prisma.paymentAttempt.findFirst({ where: { order: { publicId: azonosito } }, orderBy: { attemptNo: "asc" } });
      if (!attempt) throw error;
    }
  }
  if (!attempt) return valasz({ hiba: "A fizetési kísérlet nem található." }, 409);
  if (!ujInditas) {
    if (attempt.state === "REDIRECTED" && attempt.paymentUrl) return valasz({ paymentUrl: attempt.paymentUrl, allapot: attempt.state });
    return valasz({ hiba: "A fizetés állapotát ellenőrizzük; új fizetést nem indítottunk." , allapot: attempt.state }, 409);
  }

  try {
    const started = await pay.indit({ orderRef: attempt.merchantRef, osszegHuf: attempt.amountHuf, email: order.vevo.email, visszateresiUrl: visszateresiCim(request, azonosito) });
    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { state: "REDIRECTED", providerPaymentId: String(started.transactionId), paymentUrl: started.paymentUrl } });
      await tx.paymentEvent.create({ data: { provider: "simplepay", eventFingerprint: createHash("sha256").update(`${attempt.id}:start:${started.transactionId}`).digest("hex"), paymentAttemptId: attempt.id, verifiedState: "REDIRECTED", processedAt: new Date() } });
    });
    return valasz({ paymentUrl: started.paymentUrl, allapot: "REDIRECTED" });
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { state: "UNKNOWN" } });
      await tx.order.update({ where: { id: attempt.orderId }, data: { paymentState: "UNKNOWN" } });
      await tx.paymentEvent.create({ data: { provider: "simplepay", eventFingerprint: createHash("sha256").update(`${attempt.id}:start:unknown`).digest("hex"), paymentAttemptId: attempt.id, verifiedState: "UNKNOWN", processedAt: new Date() } });
    });
    const hiba = error instanceof SimplePayHiba ? error.kod : "ISMERETLEN";
    return valasz({ hiba: "A fizetés eredményét ellenőrizni kell; ne indíts új fizetést.", kod: hiba, allapot: "UNKNOWN" }, 502);
  }
}

export async function GET(request: NextRequest, context: Kontextus) {
  const { azonosito } = await context.params;
  const order = await vendegRendeles(request, azonosito);
  if (!order) return valasz({ hiba: "A rendelés nem található." }, 404);
  const attempt = await prisma.paymentAttempt.findFirst({ where: { order: { publicId: azonosito } }, orderBy: { attemptNo: "asc" } });
  if (!attempt) return valasz({ allapot: order.paymentState });
  if (attempt.state === "SUCCEEDED") return valasz({ allapot: "PAID" });
  const pay = adapter();
  if (!pay) return valasz({ allapot: order.paymentState }, 503);
  try {
    const status = await pay.allapot(attempt.merchantRef);
    const transactionId = attempt.providerPaymentId ? Number(attempt.providerPaymentId) : undefined;
    const transaction = await pay.tranzakcioLekerdez({ orderRef: attempt.merchantRef, transactionId });
    if (transaction.osszegHuf !== attempt.amountHuf || transaction.penznem !== attempt.currency || transaction.status !== status.status || (transactionId !== undefined && transaction.transactionId !== transactionId)) throw new Error("PAYMENT_DETAILS_MISMATCH");
    const state = szolgaltatoiAllapot(status.status);
    const orderPaymentState = state === "SUCCEEDED" ? "PAID" : state === "FAILED" || state === "EXPIRED" ? state : state;
    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { state, providerPaymentId: String(transaction.transactionId) } });
      await tx.order.update({ where: { id: attempt.orderId }, data: { paymentState: orderPaymentState } });
      if (orderPaymentState === "PAID" || orderPaymentState === "FAILED" || orderPaymentState === "EXPIRED") {
        await sorbaAllitErtesitest(tx, attempt.orderId, orderPaymentState === "PAID" ? "PAYMENT_SUCCEEDED" : "PAYMENT_FAILED", "payment:" + attempt.orderId + ":" + orderPaymentState);
      }
      await tx.paymentEvent.create({ data: { provider: "simplepay", eventFingerprint: createHash("sha256").update(`${attempt.id}:status:${status.status}`).digest("hex"), paymentAttemptId: attempt.id, verifiedState: state, processedAt: new Date() } }).catch((error: { code?: string }) => { if (error.code !== "P2002") throw error; });
    });
    return valasz({ allapot: orderPaymentState });
  } catch {
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { state: "UNKNOWN" } });
    await prisma.order.update({ where: { id: attempt.orderId }, data: { paymentState: "UNKNOWN" } });
    return valasz({ allapot: "UNKNOWN", uzenet: "A fizetés állapotát később újra ellenőrizzük." }, 503);
  }
}
