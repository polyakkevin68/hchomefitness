export type KeszletInformacio =
  | { allapot: "friss"; mennyiseg: number }
  | { allapot: "elavult" | "ismeretlen" };

export function keszletInformacio(
  pillanatkep: { quantity: number | null; fetchedAt: Date } | null | undefined,
  maximalisKorMasodperc: number,
  most = new Date(),
): KeszletInformacio {
  if (!pillanatkep || !Number.isFinite(pillanatkep.fetchedAt.getTime()) || !Number.isFinite(most.getTime())
    || !Number.isSafeInteger(maximalisKorMasodperc) || maximalisKorMasodperc < 1) return { allapot: "ismeretlen" };

  const kor = most.getTime() - pillanatkep.fetchedAt.getTime();
  if (kor < 0) return { allapot: "ismeretlen" };
  if (kor >= maximalisKorMasodperc * 1000) return { allapot: "elavult" };
  if (pillanatkep.quantity === null || !Number.isFinite(pillanatkep.quantity) || pillanatkep.quantity < 0) {
    return { allapot: "ismeretlen" };
  }
  return { allapot: "friss", mennyiseg: pillanatkep.quantity };
}

export function keszletUzenet(informacio?: KeszletInformacio): string {
  if (informacio?.allapot === "elavult") return "A készletadat frissítése szükséges; a rendelhetőséget külön visszaigazoljuk.";
  if (informacio?.allapot !== "friss") return "A készlet mennyisége nem ismert; rendelés előtt visszaigazoljuk.";
  return `A forrás legutóbb ${informacio.mennyiseg} db-ot jelzett; a rendelhetőséget külön visszaigazoljuk.`;
}
