import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { letrehozMailerSendAdapter } from "./mailer-send-kapcsolat";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");

function emailAdapter() {
  const config = readAppConfig();
  if (!config.NEWSLETTER_ENABLED || !config.NEWSLETTER_CONSENT_VERSION || !config.NEWSLETTER_PRIVACY_URL || config.MAILERSEND_PROVIDER !== "mailersend" || !config.MAILERSEND_API_KEY || !config.MAILERSEND_FROM_EMAIL || !config.MAILERSEND_FROM_NAME || !config.PUBLIC_BASE_URL) return null;
  return { config, adapter: letrehozMailerSendAdapter({ apiKulcs: config.MAILERSEND_API_KEY, feladoEmail: config.MAILERSEND_FROM_EMAIL, feladoNev: config.MAILERSEND_FROM_NAME, mod: config.MAILERSEND_MODE, kornyezet: config.APP_ENV, engedelyezettCimek: (config.MAILERSEND_ALLOWED_RECIPIENTS ?? "").split(",") }) };
}

export async function feliratkozikHirlevelre(emailBemenet: string, hozzajarult: boolean) {
  if (!hozzajarult) return { status: "CONSENT_REQUIRED" as const };
  const email = emailBemenet.trim().toLowerCase();
  const emailKesz = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailKesz || email.length > 254) return { status: "INVALID_EMAIL" as const };
  const szolgaltato = emailAdapter();
  if (!szolgaltato) return { status: "PROVIDER_DISABLED" as const };
  const igazolas = token();
  const leiratkozas = token();
  const now = new Date();
  const subscription = await prisma.hirlevelFeliratkozas.upsert({
    where: { email },
    create: { email, hozzajarultAt: now, hozzajarulasVerzio: szolgaltato.config.NEWSLETTER_CONSENT_VERSION, igazolasHash: hash(igazolas), igazolasLejarAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), leiratkozasHash: hash(leiratkozas), szolgaltatoiAllapot: "CONFIRMATION_PENDING" },
    update: { hozzajarultAt: now, hozzajarulasVerzio: szolgaltato.config.NEWSLETTER_CONSENT_VERSION, igazolasHash: hash(igazolas), igazolasLejarAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), igazolvaAt: null, leiratkozasHash: hash(leiratkozas), leiratkozottAt: null, szolgaltatoiAllapot: "CONFIRMATION_PENDING", szolgaltatoiUzenetId: null },
  });
  const confirmUrl = new URL("/hirlevel/igazolas", szolgaltato.config.PUBLIC_BASE_URL);
  confirmUrl.searchParams.set("token", igazolas);
  const unsubscribeUrl = new URL("/hirlevel/leiratkozas", szolgaltato.config.PUBLIC_BASE_URL);
  unsubscribeUrl.searchParams.set("token", leiratkozas);
  try {
    const sent = await szolgaltato.adapter.kuld({ cimzettEmail: email, cimzettNev: email, targy: "Hírlevél-feliratkozás megerősítése", szoveg: `A feliratkozás megerősítéséhez nyisd meg: ${confirmUrl}\nLeiratkozási hivatkozás: ${unsubscribeUrl}`, html: `<p>A feliratkozás megerősítéséhez <a href="${confirmUrl}">nyisd meg ezt a hivatkozást</a>.</p><p><a href="${unsubscribeUrl}">Leiratkozás</a></p>`, ertesitesAzonosito: subscription.id });
    await prisma.hirlevelFeliratkozas.update({ where: { id: subscription.id }, data: { szolgaltatoiAllapot: "ACCEPTED", szolgaltatoiUzenetId: sent.uzenetId } });
    return { status: "PERSISTED" as const };
  } catch {
    await prisma.hirlevelFeliratkozas.update({ where: { id: subscription.id }, data: { szolgaltatoiAllapot: "FAILED" } });
    return { status: "PERSISTED" as const };
  }
}

export async function igazolHirlevelFeliratkozast(value: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  const now = new Date();
  const result = await prisma.hirlevelFeliratkozas.updateMany({ where: { igazolasHash: hash(value), igazolasLejarAt: { gt: now }, igazolvaAt: null, leiratkozottAt: null }, data: { igazolvaAt: now, szolgaltatoiAllapot: "CONFIRMED" } });
  return result.count === 1;
}

export async function leiratkozikHirlevelrol(value: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  const now = new Date();
  const result = await prisma.hirlevelFeliratkozas.updateMany({ where: { leiratkozasHash: hash(value), leiratkozottAt: null }, data: { leiratkozottAt: now, szolgaltatoiAllapot: "UNSUBSCRIBED" } });
  return result.count === 1;
}

export async function frissitHirlevelKuldesAllapotot(messageId: string, state: "DELIVERED" | "BOUNCED") {
  const result = await prisma.hirlevelFeliratkozas.updateMany({ where: { szolgaltatoiUzenetId: messageId, szolgaltatoiAllapot: { not: "UNSUBSCRIBED" } }, data: { szolgaltatoiAllapot: state } });
  return result.count === 1;
}
