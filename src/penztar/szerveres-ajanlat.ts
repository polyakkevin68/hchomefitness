import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { KosarHiba, osszesitKosarat } from "./osszegzes";
import { forrasAdatFriss } from "./forras-adat-frissesseg";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { KosarVerzioHiba } from "@/kosar/szerveres-kosar";

const AJANLAT_ERENYESSEG_MS = 10 * 60 * 1000;
const AR_SZABALY_VERZIO = 1;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function keszitAjanlatot(session: string, elvartVerzio: number) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const most = new Date();
  const expiresAt = new Date(most.getTime() + AJANLAT_ERENYESSEG_MS);

  const ajanlat = await prisma.$transaction(async (tx) => {
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
        fizetendoHuf: osszeg.fizetendoHuf!,
        arSzabalyVerzio: AR_SZABALY_VERZIO,
        expiresAt,
      },
      select: { id: true, cartVersion: true, itemSnapshots: true, szallitasiMod: true, termekOsszegHuf: true, szallitasHuf: true, fizetendoHuf: true, arSzabalyVerzio: true, expiresAt: true },
    });
    return saved;
  }, { maxWait: 5_000, timeout: 10_000 });

  return {
    ...ajanlat,
    token,
    expiresAt: ajanlat.expiresAt.toISOString(),
    fizetesEngedelyezett: false,
  };
}
