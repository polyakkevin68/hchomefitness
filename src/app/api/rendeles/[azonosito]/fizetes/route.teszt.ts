import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  lekerVendegRendelest: vi.fn(),
  findFirst: vi.fn(),
  transaction: vi.fn(),
  indit: vi.fn(),
  allapot: vi.fn(),
}));
vi.mock("@/rendeles/szerveres-rendeles", () => ({ lekerVendegRendelest: mocks.lekerVendegRendelest }));
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: { paymentAttempt: { findFirst: mocks.findFirst, update: vi.fn() }, $transaction: mocks.transaction, order: { update: vi.fn() } } }));
vi.mock("@/fizetes/simplepay-kapcsolat", () => ({ SimplePayHiba: class extends Error {}, letrehozSimplePayAdapter: () => ({ indit: mocks.indit, allapot: mocks.allapot }) }));

import { POST } from "./route";

const publicId = "HC-20260925-ABCD23456789";
const token = "v".repeat(43);
const order = { publicId, status: "CONFIRMED", paymentState: "UNPAID", totalHuf: 123_456, vevo: { email: "vasarlo@example.test" } };
const payAttempt = { id: "fizetes1", orderId: "rendeles1", merchantRef: "HC123", amountHuf: 123_456, state: "STARTING", paymentUrl: null };

function request(origin = "http://localhost:3000") {
  return new NextRequest(`http://localhost:3000/api/rendeles/${publicId}/fizetes`, {
    method: "POST", headers: { origin, cookie: `hc_rendeles_${publicId}=${token}`, "content-type": "application/json" }, body: "{}",
  });
}

describe("vendégrendelés SimplePay fizetése", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PAYMENT_PROVIDER", "simplepay");
    vi.stubEnv("SIMPLEPAY_MERCHANT_ID", "123456789");
    vi.stubEnv("SIMPLEPAY_MERCHANT_KEY", "teszt-titkos-kulcs");
    vi.stubEnv("SIMPLEPAY_ENV", "sandbox");
    vi.stubEnv("PUBLIC_BASE_URL", "http://localhost:3000");
    mocks.lekerVendegRendelest.mockResolvedValue(order);
    mocks.findFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callback) => callback({
      order: { findUnique: vi.fn().mockResolvedValue({ id: "rendeles1", status: "CONFIRMED", paymentState: "UNPAID", totalHuf: 123_456, currency: "HUF" }), update: vi.fn() },
      paymentAttempt: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(payAttempt), update: vi.fn() },
      paymentEvent: { create: vi.fn().mockResolvedValue({}) },
    }));
    mocks.indit.mockResolvedValue({ transactionId: 42, paymentUrl: "https://sandbox.simplepay.hu/fizet", expiresAt: null });
  });

  it("elutasítja más webhelyről indított kérést", async () => {
    const response = await POST(request("https://idegen.example"), { params: Promise.resolve({ azonosito: publicId }) });
    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("készlet-visszaigazolás nélkül nem hoz létre fizetési kísérletet", async () => {
    mocks.lekerVendegRendelest.mockResolvedValue({ ...order, status: "PENDING_CONFIRMATION" });
    const response = await POST(request(), { params: Promise.resolve({ azonosito: publicId }) });
    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("a szerveren rögzített rendelési összeget küldi a szolgáltatónak", async () => {
    const response = await POST(request(), { params: Promise.resolve({ azonosito: publicId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ paymentUrl: "https://sandbox.simplepay.hu/fizet", allapot: "REDIRECTED" });
    expect(mocks.indit).toHaveBeenCalledWith(expect.objectContaining({ orderRef: "HC123", osszegHuf: 123_456, email: "vasarlo@example.test" }));
  });
});
