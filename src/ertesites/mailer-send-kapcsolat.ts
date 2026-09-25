import "server-only";
import { z } from "zod";

export type MailerSendBeallitas = {
  apiKulcs: string;
  feladoEmail: string;
  feladoNev: string;
  mod: "allowlist" | "live";
  kornyezet: "development" | "test" | "staging" | "production";
  engedelyezettCimek: string[];
};

export type KuldesiAdat = { cimzettEmail: string; cimzettNev: string; targy: string; szoveg: string; html: string; ertesitesAzonosito: string };

export class MailerSendHiba extends Error {
  constructor(readonly eredmeny: "BIZTOS_HIBA" | "BIZONYTALAN", readonly kod: "BEALLITAS" | "HALOZAT" | "SZOLGALTATO" | "VALASZ") {
    super("A tranzakciós üzenet küldése nem fejeződött be ellenőrizhetően.");
    this.name = "MailerSendHiba";
  }
}

export function letrehozMailerSendAdapter(beallitas: MailerSendBeallitas, eszkoz: { fetch?: typeof fetch; idozitoMs?: number } = {}) {
  const email = z.string().email();
  if (!beallitas.apiKulcs.trim() || !email.safeParse(beallitas.feladoEmail).success || !beallitas.feladoNev.trim()) throw new MailerSendHiba("BIZTOS_HIBA", "BEALLITAS");
  if (beallitas.mod === "live" && beallitas.kornyezet !== "production") throw new MailerSendHiba("BIZTOS_HIBA", "BEALLITAS");
  const engedelyezettek = new Set(beallitas.engedelyezettCimek.map((cim) => cim.trim().toLowerCase()).filter(Boolean));
  if (beallitas.mod === "allowlist" && engedelyezettek.size === 0) throw new MailerSendHiba("BIZTOS_HIBA", "BEALLITAS");

  return {
    async kuld(adat: KuldesiAdat) {
      if (!email.safeParse(adat.cimzettEmail).success || !adat.cimzettNev.trim() || !adat.targy.trim() || !adat.szoveg.trim() || !adat.html.trim() || !/^[A-Za-z0-9_-]{1,80}$/.test(adat.ertesitesAzonosito)) throw new MailerSendHiba("BIZTOS_HIBA", "BEALLITAS");
      if (beallitas.mod === "allowlist" && !engedelyezettek.has(adat.cimzettEmail.trim().toLowerCase())) throw new MailerSendHiba("BIZTOS_HIBA", "BEALLITAS");
      let response: Response;
      try {
        response = await (eszkoz.fetch ?? fetch)("https://api.mailersend.com/v1/email", {
          method: "POST",
          headers: { Authorization: `Bearer ${beallitas.apiKulcs}`, "content-type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            from: { email: beallitas.feladoEmail, name: beallitas.feladoNev },
            to: [{ email: adat.cimzettEmail, name: adat.cimzettNev }],
            subject: adat.targy,
            text: adat.szoveg,
            html: adat.html,
            tags: ["hc-rendeles"],
          }),
          signal: AbortSignal.timeout(eszkoz.idozitoMs ?? 10_000),
          cache: "no-store",
          redirect: "error",
        });
      } catch { throw new MailerSendHiba("BIZONYTALAN", "HALOZAT"); }
      if (response.status !== 202) throw new MailerSendHiba(response.status >= 500 ? "BIZONYTALAN" : "BIZTOS_HIBA", "SZOLGALTATO");
      const uzenetId = response.headers.get("x-message-id")?.trim();
      if (!uzenetId || !/^[A-Za-z0-9_-]{8,128}$/.test(uzenetId)) throw new MailerSendHiba("BIZONYTALAN", "VALASZ");
      return { uzenetId };
    },
  };
}
