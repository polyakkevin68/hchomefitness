import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { letrehozMailerSendAdapter } from "@/ertesites/mailer-send-kapcsolat";
import { ellenorizFiokJelszot, hashFiokJelszot, hashFiokToken, ujFiokToken } from "./fiok-hitelesites";

export const fiokSutiNeve = "hc-fiok";
export const fiokMunkamenetNap = 30;
const probaAblakMs = 15 * 60 * 1000;
const probaLimit = 8;
const probaJelszoHash = `scrypt$16384$8$1$${"A".repeat(22)}$${"A".repeat(86)}`;

function hash(ertek: string) { return createHash("sha256").update(ertek).digest("hex"); }
export function normalizalFiokEmailt(email: string) { return email.trim().toLowerCase(); }

function mailerAdapter() {
  const config = readAppConfig();
  if (config.MAILERSEND_PROVIDER !== "mailersend" || !config.MAILERSEND_API_KEY || !config.MAILERSEND_FROM_EMAIL || !config.MAILERSEND_FROM_NAME || !config.PUBLIC_BASE_URL) {
    throw new Error("A fiók e-mail-igazolásához a levélküldés beállítása szükséges.");
  }
  return { config, adapter: letrehozMailerSendAdapter({
    apiKulcs: config.MAILERSEND_API_KEY,
    feladoEmail: config.MAILERSEND_FROM_EMAIL,
    feladoNev: config.MAILERSEND_FROM_NAME,
    mod: config.MAILERSEND_MODE,
    kornyezet: config.APP_ENV,
    engedelyezettCimek: (config.MAILERSEND_ALLOWED_RECIPIENTS ?? "").split(","),
  }) };
}

async function kuldIgazoloLevelet(email: string, nev: string, token: string, id: string) {
  const { config, adapter } = mailerAdapter();
  const link = new URL("/fiok/igazolas", config.PUBLIC_BASE_URL);
  link.searchParams.set("token", token);
  const escaped = link.toString().replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  await adapter.kuld({
    cimzettEmail: email,
    cimzettNev: nev || email,
    targy: "HC Home Fitness – E-mail-cím igazolása",
    szoveg: `A fiók aktiválásához nyisd meg ezt a hivatkozást: ${link.toString()} . A hivatkozás 30 percig érvényes.`,
    html: `<p>Kedves ${nev || "Vásárlónk"}!</p><p><a href="${escaped}">E-mail-cím igazolása és belépés</a></p><p>A hivatkozás 30 percig érvényes.</p>`,
    ertesitesAzonosito: id,
  });
}

export async function inditFiokIgazolast(emailInput: string, nev: string, jelszo: string) {
  const email = normalizalFiokEmailt(emailInput);
  const jelszoHash = await hashFiokJelszot(jelszo);
  const fiokToken = ujFiokToken();
  const now = new Date();
  const eredmeny = await prisma.$transaction(async (tx) => {
    const fiok = await tx.vasarloiFiok.findUnique({ where: { email } });
    if (fiok?.emailIgazolvaAt || fiok?.letiltvaAt) return null;
    const mentett = fiok
      ? await tx.vasarloiFiok.update({ where: { id: fiok.id }, data: { jelszoHash, nev: nev.trim() } })
      : await tx.vasarloiFiok.create({ data: { email, jelszoHash, nev: nev.trim() } });
    await tx.vasarloiEmailIgazolas.updateMany({ where: { fiokId: mentett.id, usedAt: null }, data: { usedAt: now } });
    const igazolas = await tx.vasarloiEmailIgazolas.create({ data: { fiokId: mentett.id, tokenHash: hashFiokToken(fiokToken), expiresAt: new Date(now.getTime() + 30 * 60 * 1000) } });
    return { fiok: mentett, igazolasId: igazolas.id };
  });
  if (!eredmeny) return { sikeres: true };
  await kuldIgazoloLevelet(email, nev, fiokToken, eredmeny.igazolasId);
  return { sikeres: true };
}

export async function igazolFiokEmailt(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const munkamenetToken = ujFiokToken();
  const now = new Date();
  const igy = await prisma.$transaction(async (tx) => {
    const igazolas = await tx.vasarloiEmailIgazolas.findUnique({ where: { tokenHash: hashFiokToken(token) } });
    if (!igazolas || igazolas.usedAt || igazolas.expiresAt <= now) return null;
    const foglalas = await tx.vasarloiEmailIgazolas.updateMany({ where: { id: igazolas.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
    if (foglalas.count !== 1) return null;
    const fiok = await tx.vasarloiFiok.update({ where: { id: igazolas.fiokId }, data: { emailIgazolvaAt: now } });
    const lejart = new Date(now.getTime() + fiokMunkamenetNap * 24 * 60 * 60 * 1000);
    await tx.vasarloiMunkamenet.create({ data: { fiokId: fiok.id, tokenHash: hashFiokToken(munkamenetToken), expiresAt: lejart } });
    return { fiok: { id: fiok.id, email: fiok.email, nev: fiok.nev }, token: munkamenetToken, expiresAt: lejart };
  });
  return igy;
}

export async function beleptetFiokot(emailInput: string, jelszo: string, forras: string) {
  const email = normalizalFiokEmailt(emailInput);
  const emailHash = hash(email);
  const forrasHash = hash(forras.slice(0, 300));
  const now = new Date();
  const regiek = new Date(now.getTime() - probaAblakMs);
  const fiok = await prisma.vasarloiFiok.findUnique({ where: { email } });
  const jo = await ellenorizFiokJelszot(jelszo, fiok?.jelszoHash ?? probaJelszoHash);
  const sikeres = await prisma.$transaction(async (tx) => {
    const probak = await tx.vasarloiBelepesiProba.count({ where: { emailHash, sikeres: false, createdAt: { gte: regiek } } });
    const joE = probak < probaLimit && Boolean(fiok?.emailIgazolvaAt && !fiok.letiltvaAt && jo);
    await tx.vasarloiBelepesiProba.create({ data: { emailHash, forrasHash, sikeres: joE } });
    return joE;
  }, { isolationLevel: "Serializable" });
  if (!sikeres || !fiok) return null;
  const token = ujFiokToken();
  const expiresAt = new Date(now.getTime() + fiokMunkamenetNap * 24 * 60 * 60 * 1000);
  await prisma.vasarloiMunkamenet.create({ data: { fiokId: fiok.id, tokenHash: hashFiokToken(token), expiresAt } });
  return { fiok: { id: fiok.id, email: fiok.email, nev: fiok.nev }, token, expiresAt };
}

export async function hitelesitFiokMunkamenetet(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await prisma.vasarloiMunkamenet.findUnique({ where: { tokenHash: hashFiokToken(token) }, include: { fiok: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.fiok.emailIgazolvaAt || session.fiok.letiltvaAt) return null;
  return { id: session.fiok.id, email: session.fiok.email, nev: session.fiok.nev };
}

export async function kijelentkeztetFiokot(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await prisma.vasarloiMunkamenet.updateMany({ where: { tokenHash: hashFiokToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function fiokRendelesek(fiokId: string) {
  return prisma.order.findMany({ where: { fiokId }, orderBy: { createdAt: "desc" }, take: 100, select: { publicId: true, status: true, paymentState: true, totalHuf: true, discountHuf: true, couponCode: true, currency: true, itemSnapshots: true, createdAt: true } });
}

export async function fiokCimek(fiokId: string) {
  return prisma.vasarloiCim.findMany({ where: { fiokId }, orderBy: [{ alapertelmezett: "desc" }, { createdAt: "asc" }] });
}

export async function fiokCimLetrehoz(fiokId: string, adat: { nev: string; iranyitoszam: string; telepules: string; cim: string; alapertelmezett: boolean }) {
  return prisma.$transaction(async (tx) => {
    const darab = await tx.vasarloiCim.count({ where: { fiokId } });
    if (darab >= 20) throw new Error("Legfeljebb 20 cím menthető a fiókhoz.");
    const alapertelmezett = adat.alapertelmezett || darab === 0;
    if (alapertelmezett) await tx.vasarloiCim.updateMany({ where: { fiokId, alapertelmezett: true }, data: { alapertelmezett: false } });
    return tx.vasarloiCim.create({ data: { ...adat, alapertelmezett, fiok: { connect: { id: fiokId } } } });
  }, { isolationLevel: "Serializable" });
}

export async function fiokCimTorol(fiokId: string, cimId: string) {
  return prisma.$transaction(async (tx) => {
    const cim = await tx.vasarloiCim.findFirst({ where: { id: cimId, fiokId } });
    if (!cim) return false;
    await tx.vasarloiCim.delete({ where: { id: cim.id } });
    if (cim.alapertelmezett) {
      const kovetkezo = await tx.vasarloiCim.findFirst({ where: { fiokId }, orderBy: { createdAt: "asc" } });
      if (kovetkezo) await tx.vasarloiCim.update({ where: { id: kovetkezo.id }, data: { alapertelmezett: true } });
    }
    return true;
  });
}

export async function kapcsolKorabbiRendelestFiokhoz(fiokId: string, email: string, publicId: string, vendegToken: string) {
  if (!/^HC-[0-9]{8}-[A-F0-9]{12}$/.test(publicId) || !/^[A-Za-z0-9_-]{40,60}$/.test(vendegToken)) return false;
  const rendeles = await prisma.order.findFirst({ where: { publicId, guestAccessHash: hash(vendegToken), customerEmail: { equals: normalizalFiokEmailt(email), mode: "insensitive" } }, select: { id: true, fiokId: true } });
  if (!rendeles || (rendeles.fiokId && rendeles.fiokId !== fiokId)) return false;
  const frissites = await prisma.order.updateMany({ where: { id: rendeles.id, OR: [{ fiokId: null }, { fiokId }] }, data: { fiokId } });
  return frissites.count === 1;
}
