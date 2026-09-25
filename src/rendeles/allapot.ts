export type RendelesiAllapot = "PENDING_CONFIRMATION" | "CONFIRMED" | "REJECTED";

export function leptetRendelesAllapotot(jelenlegi: RendelesiAllapot, kovetkezo: RendelesiAllapot): RendelesiAllapot {
  if (jelenlegi !== "PENDING_CONFIRMATION" || (kovetkezo !== "CONFIRMED" && kovetkezo !== "REJECTED")) {
    throw new Error("A rendelés állapota ebből az állapotból nem módosítható.");
  }
  return kovetkezo;
}
