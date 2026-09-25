import "server-only";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { KosarHiba, osszesitKosarat, type KosarTetel, type SzallitasiMod } from "./osszegzes";

/** A termékárat az adatbázisból olvassa; a böngésző nem küldhet egységárat. */
export async function keszitSzerveresOsszegzest(tetelek: KosarTetel[], szallitasiMod: SzallitasiMod | null) {
  if (!Array.isArray(tetelek) || tetelek.length < 1 || tetelek.length > 50
    || tetelek.some((tetel) => !tetel || typeof tetel.termekId !== "string" || !tetel.termekId)) {
    throw new KosarHiba("A kosár üres vagy hibás tételeket tartalmaz.", "HIBAS_TETEL");
  }

  const termekek = await prisma.product.findMany({
    where: { id: { in: [...new Set(tetelek.map((tetel) => tetel.termekId))] } },
    select: { id: true, sku: true, name: true, brand: true, source: true, priceHuf: true, isActive: true, isPublished: true, isPurchasable: true, isTestFixture: true },
  });
  return osszesitKosarat(tetelek, termekek.map((termek) => ({
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
  })), szallitasiMod);
}
