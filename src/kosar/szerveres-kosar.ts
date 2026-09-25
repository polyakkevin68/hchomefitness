import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-beallitas";
import { keszletInformacio } from "@/catalog/keszlet-allapot";
import { KosarHiba, osszesitKosarat, type KosarTetel } from "@/penztar/osszegzes";

const LEJARAT_NAP = 30;
export const KOSAR_SUTI = "hc_kosar";

export class KosarVerzioHiba extends Error {
  constructor() { super("A kosár időközben megváltozott. Frissítsd az oldalt."); this.name = "KosarVerzioHiba"; }
}

function hashSession(session: string): string {
  return createHash("sha256").update(session).digest("hex");
}

function validSession(session: string | undefined): session is string {
  return typeof session === "string" && /^[A-Za-z0-9_-]{40,60}$/.test(session);
}

export async function betoltVagyLetrehozKosarat(session?: string) {
  const now = new Date();
  if (validSession(session)) {
    const sessionHash = hashSession(session);
    const existing = await prisma.kosar.findUnique({ where: { sessionHash } });
    if (existing && existing.expiresAt > now) return { session, kosarId: existing.id, verzio: existing.version };
  }

  const ujSession = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + LEJARAT_NAP * 24 * 60 * 60 * 1000);
  const created = await prisma.kosar.create({ data: { sessionHash: hashSession(ujSession), expiresAt } });
  return { session: ujSession, kosarId: created.id, verzio: created.version };
}

function kaphato(termek: { brand: string; source: string; isActive: boolean; isPublished: boolean; isPurchasable: boolean; isTestFixture: boolean; keszlet: { quantity: number | null; fetchedAt: Date } | null }) {
  const keszlet = keszletInformacio(termek.keszlet, readAppConfig().STOCK_MAX_AGE_SECONDS);
  return termek.brand === "HC Home Fitness" && termek.source === "unas" && termek.isActive
    && termek.isPublished && termek.isPurchasable && !termek.isTestFixture
    && keszlet.allapot === "friss" && keszlet.mennyiseg > 0;
}

async function leptetVerziot(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], kosarId: string, verzio: number) {
  const frissites = await tx.kosar.updateMany({
    where: { id: kosarId, version: verzio },
    data: { version: { increment: 1 } },
  });
  if (frissites.count !== 1) throw new KosarVerzioHiba();
}

export async function lekerKosarOsszegzes(session: string) {
  const kosar = await prisma.kosar.findUnique({
    where: { sessionHash: hashSession(session) },
    include: { tetelek: { include: { termek: { include: { keszlet: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!kosar || kosar.expiresAt <= new Date()) throw new KosarHiba("A kosár lejárt.", "HIBAS_TETEL");

  let termekOsszegHuf = 0;
  let vanNemKaphato = false;
  const tetelek = kosar.tetelek.map(({ termek, mennyiseg }) => {
    const available = kaphato(termek) && Number.isSafeInteger(termek.priceHuf) && termek.priceHuf >= 0;
    if (!available) vanNemKaphato = true;
    const sorOsszegHuf = available ? termek.priceHuf * mennyiseg : 0;
    if (available) termekOsszegHuf += sorOsszegHuf;
    return { termekId: termek.id, cikkszam: termek.sku, nev: termek.name, mennyiseg, egysegarHuf: available ? termek.priceHuf : null, sorOsszegHuf: available ? sorOsszegHuf : null, kaphato: available };
  });
  if (!Number.isSafeInteger(termekOsszegHuf)) throw new KosarHiba("A kosár összege túl nagy.", "TUL_NAGY_OSSZEG");
  const osszegzes = !vanNemKaphato && tetelek.length > 0
    ? osszesitKosarat(tetelek.map((tetel) => ({ termekId: tetel.termekId, mennyiseg: tetel.mennyiseg })), kosar.tetelek.map(({ termek }) => ({
      id: termek.id, sku: termek.sku, nev: termek.name, marka: termek.brand, forras: termek.source,
      arHuf: termek.priceHuf, aktiv: termek.isActive, kozzetett: termek.isPublished,
      vasarolhato: termek.isPurchasable, probaAdat: termek.isTestFixture,
    })), kosar.szallitasiMod === "hazhoz" || kosar.szallitasiMod === "emeletre" ? kosar.szallitasiMod : null)
    : null;
  return {
    verzio: kosar.version,
    tetelek,
    szallitasiMod: kosar.szallitasiMod,
    termekOsszegHuf: vanNemKaphato ? null : termekOsszegHuf,
    szallitasHuf: osszegzes?.szallitasHuf ?? null,
    fizetendoHuf: osszegzes?.fizetendoHuf ?? null,
    vasarlasEngedelyezett: false,
  };
}

export async function modositSzallitasiModot(session: string, szallitasiMod: "hazhoz" | "emeletre", elvartVerzio: number) {
  await prisma.$transaction(async (tx) => {
    const kosar = await tx.kosar.findUnique({ where: { sessionHash: hashSession(session) } });
    if (!kosar || kosar.expiresAt <= new Date()) throw new KosarHiba("A kosár lejárt.", "HIBAS_TETEL");
    if (kosar.version !== elvartVerzio) throw new KosarVerzioHiba();
    await leptetVerziot(tx, kosar.id, elvartVerzio);
    await tx.kosar.update({ where: { id: kosar.id }, data: { szallitasiMod } });
  }, { maxWait: 5_000, timeout: 10_000 });
  return lekerKosarOsszegzes(session);
}

export async function hozzaadKosarhoz(session: string, termekId: string, elvartVerzio: number) {
  await prisma.$transaction(async (tx) => {
    const kosar = await tx.kosar.findUnique({ where: { sessionHash: hashSession(session) } });
    if (!kosar || kosar.expiresAt <= new Date()) throw new KosarHiba("A kosár lejárt.", "HIBAS_TETEL");
    if (kosar.version !== elvartVerzio) throw new KosarVerzioHiba();
    await leptetVerziot(tx, kosar.id, elvartVerzio);

    const termek = await tx.product.findUnique({ where: { id: termekId }, include: { keszlet: true } });
    if (!termek || !kaphato(termek)) throw new KosarHiba("A termék nincs közzétéve vagy nem vásárolható.", "NEM_VASAROLHATO");
    const meglevo = await tx.kosarTetel.findUnique({ where: { kosarId_termekId: { kosarId: kosar.id, termekId } } });
    const mennyiseg = (meglevo?.mennyiseg ?? 0) + 1;
    osszesitKosarat([{ termekId, mennyiseg }], [{
      id: termek.id, sku: termek.sku, nev: termek.name, marka: termek.brand, forras: termek.source,
      arHuf: termek.priceHuf, aktiv: termek.isActive, kozzetett: termek.isPublished,
      vasarolhato: termek.isPurchasable, probaAdat: termek.isTestFixture,
    }], null);
    await tx.kosarTetel.upsert({
      where: { kosarId_termekId: { kosarId: kosar.id, termekId } },
      create: { kosarId: kosar.id, termekId, mennyiseg },
      update: { mennyiseg },
    });
  }, { maxWait: 5_000, timeout: 10_000 });
  return lekerKosarOsszegzes(session);
}

export async function modositKosarTetelt(session: string, tetel: KosarTetel, elvartVerzio: number) {
  await prisma.$transaction(async (tx) => {
    const sessionHash = hashSession(session);
    const kosar = await tx.kosar.findUnique({ where: { sessionHash } });
    if (!kosar || kosar.expiresAt <= new Date()) throw new KosarHiba("A kosár lejárt.", "HIBAS_TETEL");
    if (kosar.version !== elvartVerzio) throw new KosarVerzioHiba();
    await leptetVerziot(tx, kosar.id, elvartVerzio);

    const termek = await tx.product.findUnique({ where: { id: tetel.termekId }, include: { keszlet: true } });
    if (!termek || !kaphato(termek)) throw new KosarHiba("A termék nincs közzétéve vagy nem vásárolható.", "NEM_VASAROLHATO");
    osszesitKosarat([tetel], [{
      id: termek.id, sku: termek.sku, nev: termek.name, marka: termek.brand, forras: termek.source,
      arHuf: termek.priceHuf, aktiv: termek.isActive, kozzetett: termek.isPublished,
      vasarolhato: termek.isPurchasable, probaAdat: termek.isTestFixture,
    }], null);

    await tx.kosarTetel.upsert({
      where: { kosarId_termekId: { kosarId: kosar.id, termekId: termek.id } },
      create: { kosarId: kosar.id, termekId: termek.id, mennyiseg: tetel.mennyiseg },
      update: { mennyiseg: tetel.mennyiseg },
    });
  }, { maxWait: 5_000, timeout: 10_000 });
  return lekerKosarOsszegzes(session);
}

export async function torolKosarTetelt(session: string, termekId: string, elvartVerzio: number) {
  await prisma.$transaction(async (tx) => {
    const kosar = await tx.kosar.findUnique({ where: { sessionHash: hashSession(session) } });
    if (!kosar || kosar.expiresAt <= new Date()) throw new KosarHiba("A kosár lejárt.", "HIBAS_TETEL");
    if (kosar.version !== elvartVerzio) throw new KosarVerzioHiba();
    await leptetVerziot(tx, kosar.id, elvartVerzio);
    await tx.kosarTetel.deleteMany({ where: { kosarId: kosar.id, termekId } });
  }, { maxWait: 5_000, timeout: 10_000 });
  return lekerKosarOsszegzes(session);
}
