import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { prisma } from "@/lib/adatbazis-kapcsolat";

export const dynamic = "force-dynamic";
const maxPdfMeret = 10 * 1024 * 1024;

function valasz(adat: unknown, status = 200) {
  return NextResponse.json(adat, { status, headers: { "Cache-Control": "private, no-store" } });
}

function eredetHelyes(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

export async function GET(request: NextRequest) {
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_invoices");
  if (!admin) return valasz({ hiba: "Ehhez a számlalistához nincs jogosultságod." }, 401);
  const [szamlak, szamlazhatoRendelesek] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, provider: true, state: true, invoiceNumber: true, requestedAt: true, issuedAt: true, lastCheckedAt: true, documentSha256: true, createdAt: true, order: { select: { publicId: true, customerName: true, customerEmail: true, paymentState: true, totalHuf: true } } },
    }),
    prisma.order.findMany({
      where: { paymentState: "PAID", invoices: { none: {} } }, orderBy: { createdAt: "asc" }, take: 100,
      select: { publicId: true, customerName: true, customerEmail: true, totalHuf: true, createdAt: true },
    }),
  ]);
  return valasz({
    szamlak: szamlak.map((invoice) => ({ ...invoice, requestedAt: invoice.requestedAt?.toISOString() ?? null, issuedAt: invoice.issuedAt?.toISOString() ?? null, lastCheckedAt: invoice.lastCheckedAt?.toISOString() ?? null, createdAt: invoice.createdAt.toISOString() })),
    szamlazhatoRendelesek: szamlazhatoRendelesek.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() })),
  });
}

export async function POST(request: NextRequest) {
  if (!eredetHelyes(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_invoices");
  if (!admin) return valasz({ hiba: "Ehhez a számlaművelethez nincs jogosultságod." }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > maxPdfMeret + 32_000) return valasz({ hiba: "A számlafájl túl nagy." }, 413);
  let form: FormData;
  try {
    if (!request.body) return valasz({ hiba: "A számlakérés nem értelmezhető." }, 400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > maxPdfMeret + 32_000) {
        await reader.cancel();
        return valasz({ hiba: "A számlafájl túl nagy." }, 413);
      }
      chunks.push(chunk.value);
    }
    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    form = await new Request(request.url, { method: "POST", headers: request.headers, body }).formData();
  } catch { return valasz({ hiba: "A számlakérés nem értelmezhető." }, 400); }
  const publicId = String(form.get("rendelesAzonosito") ?? "");
  const invoiceNumber = String(form.get("szamlaszam") ?? "").trim();
  const file = form.get("pdf");
  if (!/^HC-\d{8}-[A-F0-9]{12}$/.test(publicId) || !/^[\p{L}\p{N}./_-]{1,80}$/u.test(invoiceNumber)
    || !file || typeof file === "string" || typeof file.arrayBuffer !== "function" || file.type !== "application/pdf" || file.size < 8 || file.size > maxPdfMeret) {
    return valasz({ hiba: "A rendelés, számlaszám vagy PDF-fájl nem érvényes." }, 400);
  }
  const order = await prisma.order.findUnique({ where: { publicId }, select: { id: true, publicId: true, status: true, paymentState: true } });
  if (!order) return valasz({ hiba: "A rendelés nem található." }, 404);
  if (order.status !== "CONFIRMED" || order.paymentState !== "PAID") return valasz({ hiba: "Csak visszaigazolt és kifizetett rendeléshez rögzíthető számla." }, 409);
  const existing = await prisma.invoice.findUnique({ where: { orderId: order.id }, select: { id: true } });
  if (existing) return valasz({ hiba: "Ehhez a rendeléshez már tartozik számla." }, 409);
  const pdf = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") return valasz({ hiba: "A fájl nem PDF formátumú." }, 400);
  const now = new Date();
  const documentSha256 = createHash("sha256").update(pdf).digest("hex");
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const saved = await tx.invoice.create({ data: {
        orderId: order.id, provider: "manual", state: "ISSUED", idempotencyKey: "manual:" + order.id,
        externalId: "manual:" + invoiceNumber, invoiceNumber, documentPdf: pdf, documentSha256,
        requestedAt: now, issuedAt: now,
      }, select: { id: true, invoiceNumber: true, state: true } });
      const dedupeKey = "invoice:" + order.id + ":issued";
      await tx.notification.upsert({ where: { dedupeKey }, create: { orderId: order.id, type: "INVOICE_ISSUED", dedupeKey }, update: {} });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "invoice_registered_manual", targetType: "Order", targetId: publicId, details: { invoiceId: saved.id, invoiceNumber, documentSha256 } } });
      return saved;
    });
    return valasz({ szamla: invoice }, 201);
  } catch (hiba) {
    if (hiba && typeof hiba === "object" && "code" in hiba && hiba.code === "P2002") return valasz({ hiba: "Ehhez a rendeléshez már tartozik számla." }, 409);
    return valasz({ hiba: "A számla biztonságos rögzítése nem sikerült." }, 500);
  }
}
