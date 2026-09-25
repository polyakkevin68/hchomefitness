import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { KosarHiba, osszesitKosarat } from "./osszegzes";
import { forrasAdatFriss } from "./forras-adat-frissesseg";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { KosarVerzioHiba } from "@/kosar/szerveres-kosar";
import { szamolKuponkedvezmenyt } from "./kuponok";

const AJANLAT_ERENYESSEG_MS = 10 * 60 * 1000;
const AR_SZABALY_VERZIO = 1;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export class KuponHiba extends Error { constructor(message: string) { super(message); this.name = "KuponHiba"; } }

async function tranzakcioUjraprobaval<T>(muvelet: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let proba = 0; ; proba += 1) {
    try {
      return await prisma.$transaction(muvelet, { maxWait: 5_000, timeout: 10_000, isolationLevel: "Serializable" });
    } catch (hiba) {
      const kod = hiba && typeof hiba === "object" && "code" in hiba ? (hiba as { code?: unknown }).code : null;
      if (kod !== "P2034" || proba >= 4) throw hiba;
      await new Promise((resolve) => setTimeout(resolve, 20 * (proba + 1)));
    }
  }
}

export async function keszitAjanlatot(session: string, elvartVerzio: number, kuponKodBemenet?: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const most = new Date();
  const expiresAt = new Date(most.getTime() + AJANLAT_ERENYESSEG_MS);

  const ajanlat = await tranzakcioUjraprobaval(async (tx) => {
    const kosar = await tx.kosar.findUnique({
      where: { sessionHash: hashToken(session) },
      include: { tetelek: { include: { termek: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!kosar || kosar.expiresAt <= most) throw new KosarHiba("A kosár lejárt.", "HIBAS_TETEL");
    if (kosar.version !== elvartVerzio) throw new KosarVerzioHiba();
    if (kosar.szallitasiMod !== "hazhoz" && kosar.szallitasiMod !== "emeletre") {
      throw new KosarHiba("Az ajánlathoz előbb válassz szállítási módot.", "HIBAS_TETEL");
    }
    const arMaximalisKor = readAppConfig().PRICE_MAX_AGE_SECONDS;
    if (kosar.tetelek.some(({ termek }) => !forrasAdatFriss(termek.lastImportedAt, arMaximalisKor, most))) {
      throw new KosarHiba("A termék ára frissítés alatt áll. Próbáld újra később.", "FORRAS_ADAT_ELAVULT");
    }

    const tetelek = kosar.tetelek.map(({ termek, mennyiseg }) => ({ termekId: termek.id, mennyiseg }));
    const termekek = kosar.tetelek.map(({ termek }) => ({
      id: termek.id,
      sku: termek.sku,
      nev: termek.name,
      marka: termek.brand,
      forras: termek.source,
      arHuf: termek.priceHuf,
      aktiv: termek.isActive,
      kozzetett: termek.isPublished,
      vasarolhato: termek.isPurchasable,
      probaAdat: termek.isTestFixture,
    }));
    const osszeg = osszesitKosarat(tetelek, termekek, kosar.szallitasiMod);
    const kuponKod = kuponKodBemenet?.trim().toUpperCase() || null;
    await tx.kuponFelhasznalas.updateMany({ where: { kosarId: kosar.id, allapot: "RESERVED" }, data: { allapot: "RELEASED" } });
    let kedvezmenyHuf = 0;
    if (kuponKod) {
      if (!/^[A-Z0-9_-]{3,40}$/.test(kuponKod)) throw new KuponHiba("A kuponkód formátuma nem megfelelő.");
      const kupon = await tx.kupon.findUnique({ where: { kod: kuponKod } });
      if (!kupon) throw new KuponHiba("A kupon nem érvényes vagy lejárt.");
      const felhasznalt = await tx.kuponFelhasznalas.count({ where: { kuponId: kupon.id, OR: [
        { allapot: "USED" },
        { allapot: "RESERVED", checkoutQuote: { expiresAt: { gt: most } } },
      ] } });
      const eredmeny = szamolKuponkedvezmenyt({
        kod: kupon.kod, tipus: kupon.tipus as "SZAZALEK" | "OSSZEG", ertek: kupon.ertek,
        minimumHuf: kupon.minimumHuf, maximumHuf: kupon.maximumHuf, kezdet: kupon.indulAt, veg: kupon.lejarAt,
        felhasznalasiKeret: kupon.felhasznalasiKeret, felhasznalt, aktiv: kupon.aktiv,
        osszevonhato: kupon.osszevonhato, kategoriak: kupon.kategoriak, cikkszamok: kupon.cikkszamok,
      }, kosar.tetelek.map(({ termek, mennyiseg }) => ({ cikkszam: termek.sku, kategoria: termek.category, sorOsszegHuf: termek.priceHuf * mennyiseg })), most);
      if (!eredmeny.ervenyes) throw new KuponHiba(eredmeny.hiba);
      kedvezmenyHuf = eredmeny.kedvezmenyHuf;
    }
    const snapshots = kosar.tetelek.map(({ termek, mennyiseg }) => ({
      termekId: termek.id,
      cikkszam: termek.sku,
      nev: termek.name,
      mennyiseg,
      egysegarHuf: termek.priceHuf,
      sorOsszegHuf: termek.priceHuf * mennyiseg,
      termekFrissitveAt: termek.updatedAt.toISOString(),
    }));

    const saved = await tx.checkoutQuote.create({
      data: {
        tokenHash,
        kosarId: kosar.id,
        cartVersion: kosar.version,
        itemSnapshots: snapshots,
        szallitasiMod: kosar.szallitasiMod,
        termekOsszegHuf: osszeg.termekOsszegHuf,
        szallitasHuf: osszeg.szallitasHuf!,
        fizetendoHuf: osszeg.fizetendoHuf! - kedvezmenyHuf,
        kuponKod,
        kedvezmenyHuf,
        arSzabalyVerzio: AR_SZABALY_VERZIO,
        expiresAt,
      },
      select: { id: true, cartVersion: true, itemSnapshots: true, szallitasiMod: true, termekOsszegHuf: true, szallitasHuf: true, fizetendoHuf: true, kuponKod: true, kedvezmenyHuf: true, arSzabalyVerzio: true, expiresAt: true },
    });
    if (kuponKod) {
      const kupon = await tx.kupon.findUniqueOrThrow({ where: { kod: kuponKod }, select: { id: true } });
      await tx.kuponFelhasznalas.create({ data: { kuponId: kupon.id, kosarId: kosar.id, checkoutQuoteId: saved.id, kedvezmenyHuf } });
    }
    return saved;
  });

  return {
    ...ajanlat,
    token,
    expiresAt: ajanlat.expiresAt.toISOString(),
    fizetesEngedelyezett: false,
  };
}
