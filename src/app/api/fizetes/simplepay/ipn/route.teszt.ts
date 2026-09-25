import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  class Hiba extends Error { constructor(readonly kod: string) { super(); } }
  return { Hiba, findAttempt: vi.fn(), findCurrent: vi.fn(), createEvent: vi.fn(), updateAttempt: vi.fn(), updateOrder: vi.fn(), transaction: vi.fn(), findEvent: vi.fn(), processIpn: vi.fn() };
});
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: { paymentAttempt: { findUnique: mocks.findAttempt }, paymentEvent: { findFirst: mocks.findEvent }, $transaction: mocks.transaction } }));
vi.mock("@/ertesites/feldolgozo", () => ({ sorbaAllitErtesitest: vi.fn(async () => ({})) }));
vi.mock("@/fizetes/simplepay-kapcsolat", () => ({
  SimplePayHiba: mocks.Hiba,
  letrehozSimplePayAdapter: () => ({ feldolgozIpn: mocks.processIpn }),
}));

import { POST } from "./route";

const ipn = { merchant: "kereskedo", orderRef: "HC123", transactionId: 77, status: "FINISHED", salt: "a".repeat(32) };
const raw = JSON.stringify(ipn);
const ack = JSON.stringify({ ...ipn, receiveDate: "2026-09-25T12:00:00.000Z" });

function request(body = raw) {
  return new NextRequest("https://bolt.example/api/fizetes/simplepay/ipn", { method: "POST", headers: { "content-type": "application/json", signature: "alairas" }, body });
}

describe("SimplePay IPN végpont", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PAYMENT_PROVIDER", "simplepay");
    vi.stubEnv("SIMPLEPAY_MERCHANT_ID", "kereskedo");
    vi.stubEnv("SIMPLEPAY_MERCHANT_KEY", "tesztkulcs");
    vi.stubEnv("SIMPLEPAY_ENV", "sandbox");
    mocks.processIpn.mockReturnValue({ uzenet: ipn, valaszTorzs: ack, valaszAlairas: "visszaalairas" });
    mocks.findAttempt.mockResolvedValue({ id: "pay1", provider: "simplepay", providerPaymentId: "77", state: "REDIRECTED", orderId: "ord1" });
    mocks.transaction.mockImplementation(async (callback) => callback({
      paymentAttempt: { findUnique: mocks.findCurrent.mockResolvedValue({ id: "pay1", provider: "simplepay", providerPaymentId: "77", state: "REDIRECTED", orderId: "ord1" }), updateMany: mocks.updateAttempt.mockResolvedValue({ count: 1 }) },
      paymentEvent: { create: mocks.createEvent.mockResolvedValue({}) },
      order: { update: mocks.updateOrder.mockResolvedValue({}) },
      notification: { upsert: vi.fn(async () => ({})) },
    }));
  });

  it("ellenőrzi az aláírás feldolgozóját, naplóz és aláírt visszajelzést küld", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("signature")).toBe("visszaalairas");
    expect(await response.text()).toBe(ack);
    expect(mocks.processIpn).toHaveBeenCalledWith(raw, "alairas");
    expect(mocks.updateAttempt).toHaveBeenCalledWith(expect.objectContaining({ data: { state: "SUCCEEDED", providerPaymentId: "77" } }));
    expect(mocks.updateOrder).toHaveBeenCalledWith({ where: { id: "ord1" }, data: { paymentState: "PAID" } });
  });

  it("hibás IPN aláírással nem ír az adatbázisba", async () => {
    mocks.processIpn.mockImplementation(() => { throw new mocks.Hiba("ALAIROTT_VALASZ"); });
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.findAttempt).not.toHaveBeenCalled();
  });

  it("túl nagy üzenetet elutasít", async () => {
    const response = await POST(request("x".repeat(17 * 1024)));
    expect(response.status).toBe(413);
    expect(mocks.processIpn).not.toHaveBeenCalled();
  });
});
