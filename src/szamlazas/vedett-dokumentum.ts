import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const hetNap = 7 * 24 * 60 * 60;

export function keszitSzamlaHivatkozast(invoiceId: string, config: { titok?: string; alapUrl?: string; production?: boolean }, most = Date.now()) {
  if (!config.titok || config.titok.length < 32 || !config.alapUrl) throw new Error("A védett számlahivatkozás nincs beállítva.");
  const lejar = Math.floor(most / 1000) + hetNap;
  const alairas = createHmac("sha256", config.titok).update(invoiceId + ":" + lejar).digest("base64url");
  const url = new URL("/api/szamlak/" + encodeURIComponent(invoiceId), config.alapUrl);
  if (config.production && url.protocol !== "https:") throw new Error("Éles számlahivatkozás csak HTTPS lehet.");
  url.searchParams.set("lejar", String(lejar));
  url.searchParams.set("alairas", alairas);
  return url.toString();
}

export function ellenorizSzamlaHivatkozast(invoiceId: string, lejar: string, alairas: string | null, titok?: string, most = Date.now()) {
  if (!titok || titok.length < 32 || !alairas || !/^\d{10}$/.test(lejar) || !/^[A-Za-z0-9_-]{43}$/.test(alairas)) return false;
  const expireAt = Number(lejar);
  if (expireAt <= Math.floor(most / 1000) || expireAt > Math.floor(most / 1000) + hetNap + 60) return false;
  const expected = createHmac("sha256", titok).update(invoiceId + ":" + lejar).digest();
  const received = Buffer.from(alairas, "base64url");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
