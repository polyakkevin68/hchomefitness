import { describe, expect, it, vi } from "vitest";
import { ellenorizSimplePayAlairast, letrehozSimplePayAdapter, simplePayAlairas, SimplePayHiba } from "./simplepay-kapcsolat";

const kulcs = "teszt-titok-kulcs-amit-kulso-hivasra-nem-hasznalunk";
const alap = { merchantId: "PUBLICTESTHUF", merchantKey: kulcs, kornyezet: "sandbox" as const };

function fetchValasz(adat: unknown, alairasFeluliras?: string) {
  const torzs = JSON.stringify(adat);
  const alairas = alairasFeluliras ?? simplePayAlairas(torzs, kulcs);
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    JSON.parse(String(init?.body));
    return new Response(torzs, { status: 200, headers: { Signature: alairas, "content-type": "application/json" } });
  });
}

describe("SimplePay v2 adapter", () => {
  it("ellenőrzi a bejövő IPN aláírását, és aláírt fogadás-visszajelzést készít", () => {
    const adapter = letrehozSimplePayAdapter(alap);
    const ipn = { merchant: alap.merchantId, orderRef: "HC-123", transactionId: 502272810, status: "FINISHED", salt: "a".repeat(32), paymentDate: "2026-09-25T12:00:00+02:00" };
    const torzs = JSON.stringify(ipn);
    const visszajelzes = adapter.feldolgozIpn(torzs, simplePayAlairas(torzs, kulcs));
    expect(visszajelzes.uzenet).toMatchObject(ipn);
    expect(JSON.parse(visszajelzes.valaszTorzs)).toMatchObject({ ...ipn, receiveDate: expect.any(String) });
    expect(ellenorizSimplePayAlairast(visszajelzes.valaszTorzs, visszajelzes.valaszAlairas, kulcs)).toBe(true);
    expect(() => adapter.feldolgozIpn(torzs, "hibas")).toThrow(SimplePayHiba);
  });

  it("elutasítja a másik kereskedő aláírt IPN üzenetét", () => {
    const adapter = letrehozSimplePayAdapter(alap);
    const torzs = JSON.stringify({ merchant: "MASIK", orderRef: "HC-123", transactionId: 42, status: "FINISHED", salt: "a".repeat(32) });
    expect(() => adapter.feldolgozIpn(torzs, simplePayAlairas(torzs, kulcs))).toThrow(SimplePayHiba);
  });

  it("HMAC-SHA384 aláírást készít és konstans idejű egyezést ellenőriz", () => {
    const alairas = simplePayAlairas('{"total":1000}', kulcs);
    expect(ellenorizSimplePayAlairast('{"total":1000}', alairas, kulcs)).toBe(true);
    expect(ellenorizSimplePayAlairast('{"total":1001}', alairas, kulcs)).toBe(false);
    expect(ellenorizSimplePayAlairast("{}", null, kulcs)).toBe(false);
  });

  it("a rendelés összegéből indít és csak hitelesített, egyező SimplePay választ fogad el", async () => {
    const kuldes = fetchValasz({ merchant: alap.merchantId, orderRef: "rendeles-123", transactionId: 502272810, paymentUrl: "https://sandbox.simplepay.hu/pay/abc", total: 159900, currency: "HUF", salt: "a".repeat(32) });
    const adapter = letrehozSimplePayAdapter(alap, { fetch: kuldes, salt: () => "b".repeat(32) });
    const eredmeny = await adapter.indit({ orderRef: "rendeles-123", osszegHuf: 159900, email: "vasarlo@example.test", visszateresiUrl: "https://bolt.example.test/fizetes/visszateres" });
    expect(eredmeny).toMatchObject({ orderRef: "rendeles-123", transactionId: 502272810, paymentUrl: "https://sandbox.simplepay.hu/pay/abc" });
    const [cel, init] = kuldes.mock.calls[0]!;
    expect(String(cel)).toBe("https://sandbox.simplepay.hu/payment/v2/v2/start");
    expect(init?.headers).toMatchObject({ Signature: simplePayAlairas(String(init?.body), kulcs) });
    expect(JSON.parse(String(init?.body))).toMatchObject({ total: 159900, currency: "HUF", merchant: alap.merchantId, orderRef: "rendeles-123", salt: "b".repeat(32) });
  });

  it("aláírt választ is elutasít, ha az összeg vagy a SimplePay fizetési domain eltér", async () => {
    const nemEgyezoOsszeg = letrehozSimplePayAdapter(alap, { fetch: fetchValasz({ merchant: alap.merchantId, orderRef: "r1", transactionId: 42, paymentUrl: "https://sandbox.simplepay.hu/pay/x", total: 1, currency: "HUF", salt: "a".repeat(32) }) });
    await expect(nemEgyezoOsszeg.indit({ orderRef: "r1", osszegHuf: 100, email: "a@b.test", visszateresiUrl: "https://bolt.test/vissza" })).rejects.toMatchObject({ kod: "VALASZ_ADAT" });
    const idegenDomain = letrehozSimplePayAdapter(alap, { fetch: fetchValasz({ merchant: alap.merchantId, orderRef: "r1", transactionId: 42, paymentUrl: "https://evil.test/pay/x", total: 100, currency: "HUF", salt: "a".repeat(32) }) });
    await expect(idegenDomain.indit({ orderRef: "r1", osszegHuf: 100, email: "a@b.test", visszateresiUrl: "https://bolt.test/vissza" })).rejects.toMatchObject({ kod: "VALASZ_ADAT" });
  });

  it("hiányzó vagy érvénytelen válaszaláírással nem dolgoz fel státuszt", async () => {
    const adapter = letrehozSimplePayAdapter(alap, { fetch: fetchValasz({ merchant: alap.merchantId, orderRef: "r1", status: "FINISHED", endState: true, salt: "a".repeat(32) }, "hibas") });
    await expect(adapter.allapot("r1")).rejects.toBeInstanceOf(SimplePayHiba);
    await expect(adapter.allapot("r1")).rejects.toMatchObject({ kod: "ALAIROTT_VALASZ" });
  });

  it("a hitelesített státuszt egyeztetésre adja át, önmagában nem jelöli sikeresnek", async () => {
    const adapter = letrehozSimplePayAdapter(alap, { fetch: fetchValasz({ merchant: alap.merchantId, orderRef: "r1", status: "INIT", endState: false, salt: "a".repeat(32) }) });
    await expect(adapter.allapot("r1")).resolves.toEqual({ orderRef: "r1", status: "INIT", endState: false });
  });

  it("aláírt lekérdezéssel ellenőrzi a tranzakciót és visszatérítési egyenleget", async () => {
    const kuldes = fetchValasz({ merchant: alap.merchantId, salt: "a".repeat(32), transactions: [{ orderRef: "r1", transactionId: 502272810, total: 1500, currency: "HUF", status: "FINISHED", remainingTotal: 1000, refunds: [{ transactionId: 600123, refundTotal: 500, status: "FINISHED" }] }] });
    const adapter = letrehozSimplePayAdapter(alap, { fetch: kuldes });
    await expect(adapter.tranzakcioLekerdez({ orderRef: "r1", transactionId: 502272810 })).resolves.toEqual({ orderRef: "r1", transactionId: 502272810, osszegHuf: 1500, penznem: "HUF", status: "FINISHED", remainingTotalHuf: 1000, refunds: [{ transactionId: 600123, refundTotal: 500, status: "FINISHED" }] });
    const [cel, init] = kuldes.mock.calls[0]!;
    expect(String(cel)).toBe("https://sandbox.simplepay.hu/payment/v2/v2/query");
    expect(JSON.parse(String(init?.body))).toMatchObject({ orderRefs: ["r1"], refunds: true, detailed: true });
  });

  it("lekérdezésnél elutasítja a tranzakcióazonosító- vagy pénznemeltérést", async () => {
    const valasz = (transactionId: number, currency = "HUF") => fetchValasz({ merchant: alap.merchantId, salt: "a".repeat(32), transactions: [{ orderRef: "r1", transactionId, total: 1500, currency, status: "FINISHED" }] });
    await expect(letrehozSimplePayAdapter(alap, { fetch: valasz(7) }).tranzakcioLekerdez({ orderRef: "r1", transactionId: 8 })).rejects.toMatchObject({ kod: "VALASZ_ADAT" });
    await expect(letrehozSimplePayAdapter(alap, { fetch: valasz(8, "EUR") }).tranzakcioLekerdez({ orderRef: "r1", transactionId: 8 })).rejects.toMatchObject({ kod: "VALASZ_ADAT" });
  });

  it("az indítási hibát nem ismétli meg és nem fogad el nem biztonságos visszatérési címet", async () => {
    const kuldes = vi.fn().mockRejectedValue(new Error("teszt hálózati hiba"));
    const adapter = letrehozSimplePayAdapter(alap, { fetch: kuldes });
    await expect(adapter.indit({ orderRef: "r1", osszegHuf: 100, email: "a@b.test", visszateresiUrl: "https://bolt.test/vissza" })).rejects.toMatchObject({ kod: "HALOZAT" });
    expect(kuldes).toHaveBeenCalledOnce();
    await expect(adapter.indit({ orderRef: "r1", osszegHuf: 100, email: "a@b.test", visszateresiUrl: "javascript:alert(1)" })).rejects.toMatchObject({ kod: "KONFIGURACIO" });
  });

  it("csak pozitív összeget és aláírt, megegyező visszatérítési választ enged", async () => {
    const kuldes = fetchValasz({ merchant: alap.merchantId, refundTransactionId: 600123, refundTotal: 500, remainingTotal: 1500, salt: "a".repeat(32) });
    const adapter = letrehozSimplePayAdapter(alap, { fetch: kuldes });
    await expect(adapter.visszaterit({ transactionId: 502272810, osszegHuf: 500 })).resolves.toEqual({ refundTransactionId: 600123, refundTotal: 500, remainingTotal: 1500 });
    await expect(adapter.visszaterit({ transactionId: 0, osszegHuf: 500 })).rejects.toMatchObject({ kod: "KONFIGURACIO" });
  });
});
