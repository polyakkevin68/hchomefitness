export type TeljesitesiAllapot = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const atmenetek: Record<TeljesitesiAllapot, readonly TeljesitesiAllapot[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function leptetTeljesitesiAllapotot(jelenlegi: TeljesitesiAllapot, kovetkezo: TeljesitesiAllapot): TeljesitesiAllapot {
  if (jelenlegi === kovetkezo) return jelenlegi;
  if (!atmenetek[jelenlegi].includes(kovetkezo)) throw new Error("A teljesítési állapot ebből az állapotból nem módosítható.");
  return kovetkezo;
}

export function ellenorizKovetesiUrl(cim: string | null | undefined): boolean {
  if (!cim) return true;
  try {
    const url = new URL(cim);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}
