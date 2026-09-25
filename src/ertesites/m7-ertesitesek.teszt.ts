import { describe, expect, it, vi } from "vitest";
import { letrehozMailerSendAdapter, MailerSendHiba } from "./mailer-send-kapcsolat";
import { keszitTranzakciosUzenetet } from "./uzenetsablonok";

const alap = { apiKulcs: "teszt-kulcs", feladoEmail: "bolt@example.test", feladoNev: "HC bolt", mod: "allowlist" as const, kornyezet: "test" as const, engedelyezettCimek: ["vasarlo@example.test"] };
const uzenet = { cimzettEmail: "vasarlo@example.test", cimzettNev: "Vevő", targy: "Rendelés", szoveg: "Szöveg", html: "<p>Szöveg</p>", ertesitesAzonosito: "notification_123" };

describe("MailerSend és magyar levélsablonok", () => {
  it("engedélyezőlistán kívüli címre hálózati kérés nélkül nem küld", async () => {
    const fetch = vi.fn();
    const adapter = letrehozMailerSendAdapter(alap, { fetch });
    await expect(adapter.kuld({ ...uzenet, cimzettEmail: "masik@example.test" })).rejects.toMatchObject({ kod: "BEALLITAS" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("a 202 választ és üzenetazonosítót elfogadja", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 202, headers: { "x-message-id": "message_12345678" } }));
    const adapter = letrehozMailerSendAdapter(alap, { fetch });
    await expect(adapter.kuld(uzenet)).resolves.toEqual({ uzenetId: "message_12345678" });
    expect(fetch).toHaveBeenCalledWith("https://api.mailersend.com/v1/email", expect.objectContaining({ method: "POST" }));
  });

  it("az ismeretlen küldési eredményt nem jelöli biztos kudarcnak", async () => {
    const adapter = letrehozMailerSendAdapter(alap, { fetch: vi.fn(async () => { throw new Error("network"); }) });
    await expect(adapter.kuld(uzenet)).rejects.toMatchObject({ eredmeny: "BIZONYTALAN", kod: "HALOZAT" });
  });

  it("élő küldést csak éles környezetben enged", () => {
    expect(() => letrehozMailerSendAdapter({ ...alap, mod: "live", kornyezet: "staging" })).toThrow(MailerSendHiba);
  });

  it("HTML-ben kódolja a vevői és termékadatokat", () => {
    const result = keszitTranzakciosUzenetet({ publicId: "HC-1", customerName: "<script>", customerEmail: "v@example.test", totalHuf: 1000, paymentState: "UNPAID", status: "PENDING", notificationType: "ORDER_RECEIVED", itemSnapshots: [{ nev: "<img>", mennyiseg: 1, sorOsszegHuf: 1000 }] });
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("&lt;img&gt;");
    expect(result.html).not.toContain("<script>");
  });

  it("ismeretlen eseményt nem alakít érvényes üzenetté", () => {
    expect(() => keszitTranzakciosUzenetet({ publicId: "HC-1", customerName: "Vevő", customerEmail: "v@example.test", totalHuf: 1, paymentState: "UNPAID", status: "PENDING", notificationType: "UNKNOWN" })).toThrow();
  });

  it("a visszatérített összeget megjeleníti az értesítésben", () => {
    const result = keszitTranzakciosUzenetet({ publicId: "HC-1", customerName: "Vevő", customerEmail: "v@example.test", totalHuf: 10_000, paymentState: "PAID", status: "CONFIRMED", notificationType: "REFUND_UPDATED", refundAmountHuf: 2_500 });
    expect(result.szoveg).toContain("2500 Ft összegű visszatérítést");
  });
});
