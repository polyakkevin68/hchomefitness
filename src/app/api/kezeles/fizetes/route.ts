import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { letrehozSimplePayAdapter, SimplePayHiba } from "@/fizetes/simplepay-kapcsolat";
import { ellenorizVisszateritesOsszeget } from "@/fizetes/allapot";
import { sorbaAllitErtesitest } from "@/ertesites/feldolgozo";

export const dynamic = "force-dynamic";
const inditasiBemenet = z.object({ muvelet: z.literal("indit"), rendelesAzonosito: z.string().regex(/^HC-\d{8}-[A-F0-9]{12}$/), osszegHuf: z.number().int().positive().max(99_999_999), indok: z.string().trim().min(10).max(500), idempotenciaKulcs: z.string().uuid() }).strict();
const egyeztetesiBemenet = z.object({ muvelet: z.literal("egyeztet"), visszateritesId: z.string().min(1).max(64) }).strict();
const bemenet = z.discriminatedUnion("muvelet", [inditasiBemenet, egyeztetesiBemenet]);

function valasz(adat: unknown, status = 200) {
  return NextResponse.json(adat, { status, headers: { "Cache-Control": "private, no-store" } });
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

export async function GET(request: NextRequest) {
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "issue_refund");
  if (!admin) return valasz({ hiba: "Ehhez a pénzügyi művelethez nincs jogosultságod." }, 401);
  const attempts = await prisma.paymentAttempt.findMany({
    where: { provider: "simplepay", state: "SUCCEEDED", order: { paymentState: "PAID" } },
    orderBy: { updatedAt: "desc" }, take: 100,
    include: { order: { select: { publicId: true, customerName: true, customerEmail: true, totalHuf: true } }, refunds: { orderBy: { createdAt: "desc" } } },
  });
  return valasz({ fizetesek: attempts.map((attempt) => {
    const lefoglalt = attempt.refunds.filter((refund) => ["REQUESTED", "UNKNOWN", "SUCCEEDED"].includes(refund.state)).reduce((osszeg, refund) => osszeg + refund.amountHuf, 0);
    return { azonosito: attempt.order.publicId, vevo: attempt.order.customerName, email: attempt.order.customerEmail, osszegHuf: attempt.amountHuf, visszateritveHuf: attempt.refunds.filter((refund) => refund.state === "SUCCEEDED").reduce((osszeg, refund) => osszeg + refund.amountHuf, 0), visszateritesreFenntartvaHuf: lefoglalt, visszaterithetoHuf: Math.max(0, attempt.amountHuf - lefoglalt), visszateritesek: attempt.refunds.map(({ id, amountHuf, reason, state, createdAt }) => ({ id, amountHuf, reason, state, createdAt: createdAt.toISOString() })) };
  }) });
}

export async function POST(request: NextRequest) {
  if (!eredetHelyes(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "issue_refund");
  if (!admin) return valasz({ hiba: "Ehhez a pénzügyi művelethez nincs jogosultságod." }, 403);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "A visszatérítés adatai nem érvényesek." }, 400);
  const pay = adapter();
  if (!pay) return valasz({ hiba: "A visszatérítés szolgáltatója nincs bekapcsolva." }, 503);
  if (parsed.data.muvelet === "egyeztet") {
    try {
      const target = await prisma.refund.findUnique({ where: { id: parsed.data.visszateritesId }, include: { paymentAttempt: { include: { order: true, refunds: true } } } });
      if (!target) return valasz({ hiba: "A visszatérítés nem található." }, 404);
      if (["SUCCEEDED", "FAILED"].includes(target.state)) return valasz({ visszaterites: { allapot: target.state, osszegHuf: target.amountHuf } });
      const attempt = target.paymentAttempt;
      if (attempt.provider !== "simplepay" || !attempt.providerPaymentId) return valasz({ hiba: "A fizetési tranzakció nem egyeztethető." }, 409);
      const transaction = await pay.tranzakcioLekerdez({ orderRef: attempt.merchantRef, transactionId: Number(attempt.providerPaymentId) });
      if (transaction.osszegHuf !== attempt.amountHuf || transaction.penznem !== "HUF" || transaction.status !== "FINISHED") return valasz({ hiba: "A szolgáltatói tranzakció adatai nem egyeznek." }, 409);
      const ismertIdk = new Set(attempt.refunds.filter((item) => item.id !== target.id && item.providerRefundId).map((item) => item.providerRefundId));
      const lehetseges = transaction.refunds.filter((item) => item.status === "FINISHED" && item.refundTotal === target.amountHuf && item.refundDate && new Date(item.refundDate) >= target.createdAt && !ismertIdk.has(String(item.transactionId)));
      let state: "SUCCEEDED" | "FAILED" | "UNKNOWN" = "UNKNOWN";
      let refundProviderId: string | null = null;
      if (lehetseges.length === 1) { state = "SUCCEEDED"; refundProviderId = String(lehetseges[0]!.transactionId); }
      else if (lehetseges.length === 0) {
        const korabbiVisszaterites = attempt.refunds.filter((item) => item.id !== target.id && item.state === "SUCCEEDED").reduce((sum, item) => sum + item.amountHuf, 0);
        if (transaction.remainingTotalHuf === attempt.amountHuf - korabbiVisszaterites) state = "FAILED";
      }
      if (state !== "UNKNOWN") {
        await prisma.$transaction(async (tx) => {
          await tx.refund.update({ where: { id: target.id, state: target.state }, data: { state, providerRefundId: refundProviderId } });
          await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: `payment_refund_${state.toLowerCase()}_reconciled`, targetType: "Order", targetId: attempt.order.publicId, details: { refundId: target.id, amountHuf: target.amountHuf, providerRefundId: refundProviderId } } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      }
      return valasz({ visszaterites: { allapot: state, osszegHuf: target.amountHuf } }, state === "UNKNOWN" ? 202 : 200);
    } catch {
      return valasz({ hiba: "A visszatérítés állapota egyelőre nem egyeztethető." }, 503);
    }
  }
  if (parsed.data.muvelet !== "indit") return valasz({ hiba: "A visszatérítési művelet nem érvényes." }, 400);
  const inditas = parsed.data;

  let uj = false;
  let refund: Awaited<ReturnType<typeof prisma.refund.create>> | null = null;
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const idempotencyKey = `simplepay-refund-${inditas.idempotenciaKulcs}`;
      const prior = await tx.refund.findUnique({ where: { idempotencyKey } });
      if (prior) return { refund: prior, uj: false };
      const attempt = await tx.paymentAttempt.findFirst({ where: { provider: "simplepay", state: "SUCCEEDED", order: { publicId: inditas.rendelesAzonosito, paymentState: "PAID" } }, include: { refunds: true } });
      if (!attempt?.providerPaymentId || !/^\d{1,12}$/.test(attempt.providerPaymentId)) throw new Error("PAYMENT_NOT_REFUNDABLE");
      if (attempt.refunds.some((item) => ["REQUESTED", "UNKNOWN"].includes(item.state))) throw new Error("REFUND_UNCERTAIN");
      const reserved = attempt.refunds.filter((item) => ["REQUESTED", "UNKNOWN", "SUCCEEDED"].includes(item.state)).reduce((sum, item) => sum + item.amountHuf, 0);
      if (!ellenorizVisszateritesOsszeget(attempt.amountHuf, reserved, inditas.osszegHuf)) throw new Error("REFUND_LIMIT");
      const created = await tx.refund.create({ data: { paymentAttemptId: attempt.id, amountHuf: inditas.osszegHuf, reason: inditas.indok, idempotencyKey, state: "REQUESTED" } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "payment_refund_requested", targetType: "Order", targetId: inditas.rendelesAzonosito, details: { amountHuf: created.amountHuf, reason: created.reason, idempotencyKey } } });
      return { refund: created, uj: true, transactionId: Number(attempt.providerPaymentId), orderId: attempt.orderId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 10_000 });
    refund = saved.refund;
    uj = saved.uj;
    if (saved.uj !== true) return valasz({ visszaterites: { allapot: refund.state, osszegHuf: refund.amountHuf } }, refund.state === "SUCCEEDED" || refund.state === "FAILED" ? 200 : 202);
    if (!saved.orderId) throw new Error("REFUND_ORDER_MISSING");
    const refundId = saved.refund.id;
    const refundOsszeg = saved.refund.amountHuf;
    const result = await pay.visszaterit({ transactionId: saved.transactionId!, osszegHuf: refundOsszeg });
    const updated = await prisma.$transaction(async (tx) => {
      const done = await tx.refund.update({ where: { id: refundId }, data: { state: "SUCCEEDED", providerRefundId: String(result.refundTransactionId) } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "payment_refund_succeeded", targetType: "Order", targetId: inditas.rendelesAzonosito, details: { amountHuf: done.amountHuf, providerRefundId: done.providerRefundId, remainingTotal: result.remainingTotal } } });
      await sorbaAllitErtesitest(tx, saved.orderId, "REFUND_UPDATED", `refund:${done.id}:succeeded`);
      return done;
    });
    return valasz({ visszaterites: { allapot: updated.state, osszegHuf: updated.amountHuf, fennmaradoHuf: result.remainingTotal } }, 200);
  } catch (hiba) {
    if (hiba instanceof Error && hiba.message === "PAYMENT_NOT_REFUNDABLE") return valasz({ hiba: "A rendeléshez nem található visszatéríthető fizetés." }, 404);
    if (hiba instanceof Error && hiba.message === "REFUND_LIMIT") return valasz({ hiba: "A kért összeg meghaladja a visszatéríthető összeget." }, 409);
    if (hiba instanceof Error && hiba.message === "REFUND_UNCERTAIN") return valasz({ hiba: "Egy korábbi visszatérítés eredménye még bizonytalan; előbb egyeztesd azt." }, 409);
    if (uj && refund) {
      const refundId = refund.id;
      try {
        const unknown = await prisma.refund.update({ where: { id: refundId }, data: { state: "UNKNOWN" } });
        await prisma.adminAuditLog.create({ data: { adminUserId: admin.id, action: "payment_refund_unknown", targetType: "Refund", targetId: unknown.id, details: { reason: hiba instanceof SimplePayHiba ? hiba.kod : "ISMERETLEN" } } });
      } catch { /* a REQUESTED rekord megmarad, ezért nem ismételjük meg a külső műveletet */ }
      return valasz({ visszaterites: { allapot: "UNKNOWN", osszegHuf: refund.amountHuf }, hiba: "A visszatérítés eredménye bizonytalan; új művelet helyett egyeztetés szükséges." }, 202);
    }
    if (hiba instanceof Prisma.PrismaClientKnownRequestError && hiba.code === "P2002") return valasz({ hiba: "Az idempotencia-kulcs ütközött. Frissítsd a pénzügyi listát." }, 409);
    if (hiba instanceof Prisma.PrismaClientKnownRequestError && hiba.code === "P2034") return valasz({ hiba: "Közben változott a visszatéríthető összeg. Frissítsd a listát." }, 409);
    return valasz({ hiba: "A visszatérítés rögzítése nem sikerült." }, 500);
  }
}
