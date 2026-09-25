import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export type SimplePayKornyezet = "sandbox" | "production";
export type SimplePayBeallitas = { merchantId: string; merchantKey: string; kornyezet: SimplePayKornyezet };
type SzallitasiBeallitas = { fetch: typeof fetch; salt: () => string; idozitoMs: number };

const valaszAlap = z.object({ merchant: z.string(), salt: z.string().min(32).max(64) }).passthrough();
const kezdesValasz = valaszAlap.extend({ orderRef: z.string(), paymentUrl: z.string().url(), transactionId: z.number().int().positive(), total: z.number().positive(), currency: z.string() });
const allapotValasz = valaszAlap.extend({ orderRef: z.string(), status: z.string(), endState: z.boolean() });
const visszateritesValasz = valaszAlap.extend({ refundTransactionId: z.number().int().positive(), refundTotal: z.number().positive(), remainingTotal: z.number().nonnegative() });
const queriedRefund = z.object({ transactionId: z.number().int().positive(), refundTotal: z.number().positive(), status: z.string(), refundDate: z.string().optional() }).passthrough();
const queriedTransaction = z.object({ orderRef: z.string(), transactionId: z.number().int().positive(), total: z.number().positive(), currency: z.string(), status: z.string(), remainingTotal: z.number().nonnegative().optional(), refunds: z.array(queriedRefund).optional() }).passthrough();
const queryResponse = valaszAlap.extend({ transactions: z.array(queriedTransaction) });
const ipnUzenet = valaszAlap.extend({ orderRef: z.string().min(1).max(64), transactionId: z.number().int().positive(), status: z.string().min(1).max(40) });

export class SimplePayHiba extends Error {
  constructor(readonly ok: boolean, readonly kod: "KONFIGURACIO" | "HALOZAT" | "ALAIROTT_VALASZ" | "SZOLGALTATOI_HIBA" | "VALASZ_ADAT") {
    super("A SimplePay-művelet nem fejeződött be ellenőrizhetően.");
    this.name = "SimplePayHiba";
  }
}

export function simplePayAlairas(torzs: string, kulcs: string): string {
  return createHmac("sha384", kulcs).update(torzs, "utf8").digest("base64");
}

export function ellenorizSimplePayAlairast(torzs: string, alairas: string | null, kulcs: string): boolean {
  if (!alairas || !/^[A-Za-z0-9+/]{64}=?$/.test(alairas)) return false;
  const kapott = Buffer.from(alairas, "base64");
  const vart = Buffer.from(simplePayAlairas(torzs, kulcs), "base64");
  return kapott.length === vart.length && timingSafeEqual(kapott, vart);
}

function egyszeruPayAlapUrl(kornyezet: SimplePayKornyezet): URL {
  return new URL(kornyezet === "sandbox" ? "https://sandbox.simplepay.hu/payment/v2" : "https://secure.simplepay.hu/payment/v2");
}

export function letrehozSimplePayAdapter(beallitas: SimplePayBeallitas, szallitas: Partial<SzallitasiBeallitas> = {}) {
  if (!beallitas.merchantId.trim() || !beallitas.merchantKey.trim()) throw new SimplePayHiba(false, "KONFIGURACIO");
  const kuldes = szallitas.fetch ?? fetch;
  const salt = szallitas.salt ?? (() => randomBytes(16).toString("hex"));
  const idozitoMs = szallitas.idozitoMs ?? 10_000;
  const alapUrl = egyszeruPayAlapUrl(beallitas.kornyezet);

  async function keres<T>(vegpont: "start" | "status" | "query" | "refund", adat: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
    const url = new URL(`${alapUrl.pathname}/v2/${vegpont}`, alapUrl.origin);
    const torzs = JSON.stringify({ ...adat, merchant: beallitas.merchantId, sdkVersion: "SimplePayV2.1", salt: salt() });
    let response: Response;
    try {
      response = await kuldes(url, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8", Accept: "application/json", Signature: simplePayAlairas(torzs, beallitas.merchantKey) },
        body: torzs,
        signal: AbortSignal.timeout(idozitoMs),
        cache: "no-store",
        redirect: "error",
      });
    } catch {
      throw new SimplePayHiba(false, "HALOZAT");
    }
    const valaszTorzs = await response.text().catch(() => "");
    if (!ellenorizSimplePayAlairast(valaszTorzs, response.headers.get("Signature"), beallitas.merchantKey)) throw new SimplePayHiba(false, "ALAIROTT_VALASZ");
    let dekodolt: unknown;
    try { dekodolt = JSON.parse(valaszTorzs); }
    catch { throw new SimplePayHiba(false, "VALASZ_ADAT"); }
    if (!response.ok) throw new SimplePayHiba(false, "SZOLGALTATOI_HIBA");
    const parsed = schema.safeParse(dekodolt);
    if (!parsed.success) throw new SimplePayHiba(false, "VALASZ_ADAT");
    return parsed.data;
  }

  return {
    feldolgozIpn(torzs: string, alairas: string | null) {
      if (!ellenorizSimplePayAlairast(torzs, alairas, beallitas.merchantKey)) throw new SimplePayHiba(false, "ALAIROTT_VALASZ");
      let adat: unknown;
      try { adat = JSON.parse(torzs); } catch { throw new SimplePayHiba(false, "VALASZ_ADAT"); }
      const parsed = ipnUzenet.safeParse(adat);
      if (!parsed.success || parsed.data.merchant !== beallitas.merchantId) throw new SimplePayHiba(false, "VALASZ_ADAT");
      const visszajelzes = Object.fromEntries(Object.entries(parsed.data).filter(([, ertek]) => ertek !== null));
      const valaszTorzs = JSON.stringify({ ...visszajelzes, receiveDate: new Date().toISOString() });
      return { uzenet: parsed.data, valaszTorzs, valaszAlairas: simplePayAlairas(valaszTorzs, beallitas.merchantKey) };
    },
    async indit(adat: { orderRef: string; osszegHuf: number; email: string; visszateresiUrl: string }) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(adat.orderRef) || !Number.isSafeInteger(adat.osszegHuf) || adat.osszegHuf < 1 || adat.osszegHuf > 99_999_999 || !z.string().email().safeParse(adat.email).success) throw new SimplePayHiba(false, "KONFIGURACIO");
      let visszateres: URL;
      try { visszateres = new URL(adat.visszateresiUrl); } catch { throw new SimplePayHiba(false, "KONFIGURACIO"); }
      const helyiSandboxCim = beallitas.kornyezet === "sandbox" && visszateres.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(visszateres.hostname);
      if (visszateres.protocol !== "https:" && !helyiSandboxCim) throw new SimplePayHiba(false, "KONFIGURACIO");
      const valasz = await keres("start", { orderRef: adat.orderRef, total: adat.osszegHuf, currency: "HUF", customerEmail: adat.email, language: "HU", url: visszateres.href }, kezdesValasz);
      const fizetesiUrl = new URL(valasz.paymentUrl);
      const vartDomain = beallitas.kornyezet === "sandbox" ? "sandbox.simplepay.hu" : "secure.simplepay.hu";
      if (valasz.orderRef !== adat.orderRef || valasz.merchant !== beallitas.merchantId || valasz.total !== adat.osszegHuf || valasz.currency !== "HUF" || fizetesiUrl.protocol !== "https:" || fizetesiUrl.hostname !== vartDomain) throw new SimplePayHiba(false, "VALASZ_ADAT");
      return { orderRef: valasz.orderRef, transactionId: valasz.transactionId, paymentUrl: fizetesiUrl.href, expiresAt: valasz.timeout ?? null };
    },
    async allapot(orderRef: string) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderRef)) throw new SimplePayHiba(false, "KONFIGURACIO");
      const valasz = await keres("status", { orderRef }, allapotValasz);
      if (valasz.orderRef !== orderRef || valasz.merchant !== beallitas.merchantId) throw new SimplePayHiba(false, "VALASZ_ADAT");
      return { orderRef: valasz.orderRef, status: valasz.status, endState: valasz.endState };
    },
    async tranzakcioLekerdez(adat: { orderRef: string; transactionId?: number }) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(adat.orderRef) || (adat.transactionId !== undefined && (!Number.isSafeInteger(adat.transactionId) || adat.transactionId < 1))) throw new SimplePayHiba(false, "KONFIGURACIO");
      const valasz = await keres("query", { orderRefs: [adat.orderRef], refunds: true, detailed: true }, queryResponse);
      const talalatok = valasz.transactions.filter((item) => item.orderRef === adat.orderRef && (adat.transactionId === undefined || item.transactionId === adat.transactionId));
      if (valasz.merchant !== beallitas.merchantId || valasz.transactions.length !== 1 || talalatok.length !== 1) throw new SimplePayHiba(false, "VALASZ_ADAT");
      const tranzakcio = talalatok[0]!;
      if (tranzakcio.currency !== "HUF") throw new SimplePayHiba(false, "VALASZ_ADAT");
      return { orderRef: tranzakcio.orderRef, transactionId: tranzakcio.transactionId, osszegHuf: tranzakcio.total, penznem: tranzakcio.currency, status: tranzakcio.status, remainingTotalHuf: tranzakcio.remainingTotal ?? null, refunds: tranzakcio.refunds ?? [] };
    },
    async visszaterit(adat: { transactionId: number; osszegHuf: number }) {
      if (!Number.isSafeInteger(adat.transactionId) || adat.transactionId < 1 || !Number.isSafeInteger(adat.osszegHuf) || adat.osszegHuf < 1) throw new SimplePayHiba(false, "KONFIGURACIO");
      const valasz = await keres("refund", { transactionId: adat.transactionId, refundTotal: adat.osszegHuf, currency: "HUF" }, visszateritesValasz);
      if (valasz.merchant !== beallitas.merchantId || valasz.refundTotal !== adat.osszegHuf) throw new SimplePayHiba(false, "VALASZ_ADAT");
      return { refundTransactionId: valasz.refundTransactionId, refundTotal: valasz.refundTotal, remainingTotal: valasz.remainingTotal };
    },
  };
}
