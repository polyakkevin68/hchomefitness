import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MailerSendHiba } from "./mailer-send-kapcsolat";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/adatbazis-kapcsolat", () => ({ prisma: { notification: { findFirst: mocks.findFirst, update: mocks.update } } }));

import { fogadMailerSendWebhook, osztalyozErtesitesiHibat } from "./feldolgozo";

const titok = "webhook-teszt-titok";
const body = JSON.stringify({ type: "activity.delivered", data: { message_id: "message_12345678" } });
const alairas = createHmac("sha256", titok).update(body, "utf8").digest("hex");

describe("MailerSend webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("MAILERSEND_PROVIDER", "mailersend");
    vi.stubEnv("MAILERSEND_WEBHOOK_SECRET", titok);
    mocks.findFirst.mockResolvedValue({ id: "notification_1", state: "SENT" });
    mocks.update.mockResolvedValue({});
  });

  it("ellenőrzi a nyers törzs HMAC-aláírását és frissíti a kézbesítést", async () => {
    await expect(fogadMailerSendWebhook(body, alairas)).resolves.toBe(true);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { providerMessageId: "message_12345678" } });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "notification_1" }, data: { state: "DELIVERED", lastError: null } });
  });

  it("hibás aláírásnál nem keres és nem módosít levelet", async () => {
    await expect(fogadMailerSendWebhook(body, "0".repeat(64))).resolves.toBe(false);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("értesítési hibák biztonságos besorolása", () => {
  it("az elküldés utáni adatbázishibát bizonytalannak veszi", () => {
    expect(osztalyozErtesitesiHibat(new Error("database"), true)).toEqual({ allapot: "UNKNOWN", kod: "STATUSZ_MENTES_HIBA" });
  });

  it("biztos szolgáltatói hibánál újrapróbálható állapotot jelöl", () => {
    expect(osztalyozErtesitesiHibat(new MailerSendHiba("BIZTOS_HIBA", "SZOLGALTATO"), false).allapot).toBe("FAILED");
  });
});
