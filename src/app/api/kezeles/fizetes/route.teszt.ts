import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), transaction: vi.fn(), refundLookup: vi.fn(), attemptLookup: vi.fn(), refundCreate: vi.fn(), refundUpdate: vi.fn(), refundCall: vi.fn(), notification: vi.fn() }));
vi.mock("@/auth/admin-munkamenet", () => ({ adminSutiNeve: "hc-admin", hitelesitAdminMunkamenetet: mocks.authenticate }));
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: { $transaction: mocks.transaction, paymentAttempt: { findMany: vi.fn() } } }));
vi.mock("@/fizetes/simplepay-kapcsolat", () => ({ SimplePayHiba: class extends Error { constructor(readonly kod: string) { super(); } }, letrehozSimplePayAdapter: () => ({ visszaterit: mocks.refundCall }) }));
vi.mock("@/ertesites/feldolgozo", () => ({ sorbaAllitErtesitest: mocks.notification.mockResolvedValue({}) }));

import { POST } from "./route";

const key = "ad5f650e-5aca-42b4-a60b-3c5347f364f3";
const input = { muvelet: "indit", rendelesAzonosito: "HC-20260925-ABCD23456789", osszegHuf: 2_500, indok: "A termék visszaérkezett a raktárba.", idempotenciaKulcs: key };
const refund = { id: "ref1", paymentAttemptId: "pay1", amountHuf: 2_500, reason: input.indok, state: "REQUESTED", idempotencyKey: `simplepay-refund-${key}` };

function request(body: unknown = input, origin = "https://bolt.example") {
  return new NextRequest("https://bolt.example/api/kezeles/fizetes", { method: "POST", headers: { origin, cookie: `hc-admin=${"a".repeat(43)}`, "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("pénzügyi visszatérítési API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PAYMENT_PROVIDER", "simplepay");
    vi.stubEnv("SIMPLEPAY_MERCHANT_ID", "kereskedo");
    vi.stubEnv("SIMPLEPAY_MERCHANT_KEY", "titkoskulcs");
    vi.stubEnv("SIMPLEPAY_ENV", "sandbox");
    mocks.authenticate.mockResolvedValue({ id: "admin1", role: "FINANCE" });
    mocks.attemptLookup.mockResolvedValue({ id: "pay1", orderId: "order1", amountHuf: 10_000, providerPaymentId: "123456789", refunds: [] });
    mocks.refundLookup.mockResolvedValue(null);
    mocks.refundCreate.mockResolvedValue(refund);
    mocks.refundUpdate.mockResolvedValue({ ...refund, state: "SUCCEEDED", providerRefundId: "123456790" });
    mocks.transaction.mockImplementation(async (callback) => callback({
      refund: { findUnique: mocks.refundLookup, create: mocks.refundCreate, update: mocks.refundUpdate },
      paymentAttempt: { findFirst: mocks.attemptLookup },
      adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    }));
    mocks.refundCall.mockResolvedValue({ refundTransactionId: 123456790, refundTotal: 2_500, remainingTotal: 7_500 });
  });

  it("csak pénzügyi jogosultsággal fogad visszatérítést", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("a teljes refund összeget a szerveroldali tranzakcióhoz köti és naplózza", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ visszaterites: { allapot: "SUCCEEDED", osszegHuf: 2_500, fennmaradoHuf: 7_500 } });
    expect(mocks.refundCall).toHaveBeenCalledWith({ transactionId: 123456789, osszegHuf: 2_500 });
    expect(mocks.refundCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ state: "REQUESTED", amountHuf: 2_500, paymentAttemptId: "pay1" }) });
    expect(mocks.notification).toHaveBeenCalledWith(expect.any(Object), "order1", "REFUND_UPDATED", "refund:ref1:succeeded");
  });

  it("túllépésnél nem hívja meg a fizetési szolgáltatót", async () => {
    mocks.attemptLookup.mockResolvedValue({ id: "pay1", orderId: "order1", amountHuf: 10_000, providerPaymentId: "123456789", refunds: [{ amountHuf: 9_000, state: "SUCCEEDED" }] });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(mocks.refundCall).not.toHaveBeenCalled();
  });

  it("idegen eredetű kérést elutasít", async () => {
    const response = await POST(request(input, "https://idegen.example"));
    expect(response.status).toBe(403);
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });
});
