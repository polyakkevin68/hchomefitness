import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { letrehozSimplePayAdapter, SimplePayHiba } from "@/fizetes/simplepay-kapcsolat";
import { leptetFizetesiAllapotot, type FizetesiAllapot } from "@/fizetes/allapot";
import { sorbaAllitErtesitest } from "@/ertesites/feldolgozo";

export const dynamic = "force-dynamic";
const maxUzenetMeret = 16 * 1024;

function json(adat: unknown, status: number) {
  return NextResponse.json(adat, { status, headers: { "Cache-Control": "no-store" } });
}

async function torzsOlvasasa(request: NextRequest): Promise<string | null> {
  const hossz = Number(request.headers.get("content-length") ?? 0);
  if (hossz > maxUzenetMeret || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let osszes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      osszes += value.byteLength;
      if (osszes > maxUzenetMeret) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(osszes);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { return null; }
}

function allapot(status: string): FizetesiAllapot | "REFUND" {
  if (status === "FINISHED") return "SUCCEEDED";
  if (status === "TIMEOUT") return "EXPIRED";
  if (["CANCELLED", "NOTAUTHORIZED", "NOTAUTHENTICATED", "REVERSED"].includes(status)) return "FAILED";
  if (["INIT", "INAUTHENTICATION", "INPAYMENT", "AUTHORIZED"].includes(status)) return "PENDING";
  if (status === "REFUND") return "REFUND";
  return "UNKNOWN";
}

function rendelesFizetesiAllapota(allapot: FizetesiAllapot) {
  return allapot === "SUCCEEDED" ? "PAID" : allapot;
}

export async function POST(request: NextRequest) {
  const config = readAppConfig();
  if (config.PAYMENT_PROVIDER !== "simplepay" || !config.SIMPLEPAY_MERCHANT_ID || !config.SIMPLEPAY_MERCHANT_KEY) return json({ hiba: "A fizetési értesítés nem fogadható." }, 503);
  const raw = await torzsOlvasasa(request);
  if (raw === null) return json({ hiba: "Az értesítés mérete vagy kódolása nem érvényes." }, 413);

  let feldolgozott: ReturnType<ReturnType<typeof letrehozSimplePayAdapter>["feldolgozIpn"]>;
  try {
    const adapter = letrehozSimplePayAdapter({ merchantId: config.SIMPLEPAY_MERCHANT_ID, merchantKey: config.SIMPLEPAY_MERCHANT_KEY, kornyezet: config.SIMPLEPAY_ENV });
    feldolgozott = adapter.feldolgozIpn(raw, request.headers.get("signature"));
  } catch (hiba) {
    const status = hiba instanceof SimplePayHiba && hiba.kod === "ALAIROTT_VALASZ" ? 401 : 400;
    return json({ hiba: "A fizetési értesítés nem hitelesíthető." }, status);
  }

  const { uzenet } = feldolgozott;
  const kiserlet = await prisma.paymentAttempt.findUnique({ where: { merchantRef: uzenet.orderRef } });
  if (!kiserlet || kiserlet.provider !== "simplepay" || (kiserlet.providerPaymentId && kiserlet.providerPaymentId !== String(uzenet.transactionId))) return json({ hiba: "A fizetési kísérlet nem található." }, 404);
  const kovetkezo = allapot(uzenet.status);
  const fingerprint = createHash("sha256").update(JSON.stringify({ merchant: uzenet.merchant, orderRef: uzenet.orderRef, transactionId: uzenet.transactionId, status: uzenet.status, refundStatus: uzenet.refundStatus ?? null, paymentDate: uzenet.paymentDate ?? null, finishDate: uzenet.finishDate ?? null })).digest("hex");

  try {
    await prisma.$transaction(async (tx) => {
      const aktualis = await tx.paymentAttempt.findUnique({ where: { id: kiserlet.id } });
      if (!aktualis || aktualis.provider !== "simplepay" || (aktualis.providerPaymentId && aktualis.providerPaymentId !== String(uzenet.transactionId))) throw new Error("PAYMENT_ATTEMPT_CHANGED");
      await tx.paymentEvent.create({ data: { provider: "simplepay", eventFingerprint: fingerprint, paymentAttemptId: aktualis.id, eventKey: `${uzenet.transactionId}:${uzenet.status}`, verifiedState: kovetkezo, processedAt: new Date() } });
      if (kovetkezo === "REFUND") return;
      let nowy: FizetesiAllapot;
      try { nowy = leptetFizetesiAllapotot(aktualis.state as FizetesiAllapot, kovetkezo); }
      catch { return; }
      if (nowy !== aktualis.state || !aktualis.providerPaymentId) {
        const changed = await tx.paymentAttempt.updateMany({ where: { id: aktualis.id, state: aktualis.state }, data: { state: nowy, providerPaymentId: String(uzenet.transactionId) } });
        if (changed.count !== 1) throw new Error("PAYMENT_ATTEMPT_CHANGED");
        await tx.order.update({ where: { id: aktualis.orderId }, data: { paymentState: rendelesFizetesiAllapota(nowy) } });
        if (nowy === "SUCCEEDED" || nowy === "FAILED" || nowy === "EXPIRED") {
          await sorbaAllitErtesitest(tx, aktualis.orderId, nowy === "SUCCEEDED" ? "PAYMENT_SUCCEEDED" : "PAYMENT_FAILED", "payment:" + aktualis.orderId + ":" + nowy);
        }
      }
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 10_000 });
  } catch (hiba) {
    if (hiba && typeof hiba === "object" && "code" in hiba && hiba.code === "P2002") {
      const duplicate = await prisma.paymentEvent.findFirst({ where: { provider: "simplepay", eventFingerprint: fingerprint }, select: { id: true } });
      if (!duplicate) return json({ hiba: "Az értesítés ütközött; újrapróbálható." }, 503);
    } else return json({ hiba: "Az értesítés rögzítése sikertelen; újrapróbálható." }, 503);
  }

  return new NextResponse(feldolgozott.valaszTorzs, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", Signature: feldolgozott.valaszAlairas, "Cache-Control": "no-store" } });
}
