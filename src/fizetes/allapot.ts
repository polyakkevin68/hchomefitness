export type FizetesiAllapot = "CREATED" | "REDIRECTED" | "PENDING" | "UNKNOWN" | "SUCCEEDED" | "FAILED" | "EXPIRED";
export type VisszateritesiAllapot = "REQUESTED" | "UNKNOWN" | "SUCCEEDED" | "FAILED";

const fizetesiAtmenetek: Record<FizetesiAllapot, readonly FizetesiAllapot[]> = {
  CREATED: ["REDIRECTED", "PENDING", "UNKNOWN", "SUCCEEDED", "FAILED"],
  REDIRECTED: ["PENDING", "UNKNOWN", "SUCCEEDED", "FAILED", "EXPIRED"],
  PENDING: ["UNKNOWN", "SUCCEEDED", "FAILED", "EXPIRED"],
  UNKNOWN: ["PENDING", "SUCCEEDED", "FAILED", "EXPIRED"],
  SUCCEEDED: [],
  FAILED: ["UNKNOWN", "SUCCEEDED"],
  EXPIRED: ["UNKNOWN", "SUCCEEDED"],
};

const visszateritesiAtmenetek: Record<VisszateritesiAllapot, readonly VisszateritesiAllapot[]> = {
  REQUESTED: ["UNKNOWN", "SUCCEEDED", "FAILED"],
  UNKNOWN: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: [],
  FAILED: ["UNKNOWN", "SUCCEEDED"],
};

export function leptetFizetesiAllapotot(jelenlegi: FizetesiAllapot, hitelesitett: FizetesiAllapot): FizetesiAllapot {
  if (jelenlegi === hitelesitett) return jelenlegi;
  if (!fizetesiAtmenetek[jelenlegi].includes(hitelesitett)) {
    throw new Error("A fizetési állapot nem módosítható erre az értékre.");
  }
  return hitelesitett;
}

export function leptetVisszateritesiAllapotot(jelenlegi: VisszateritesiAllapot, hitelesitett: VisszateritesiAllapot): VisszateritesiAllapot {
  if (jelenlegi === hitelesitett) return jelenlegi;
  if (!visszateritesiAtmenetek[jelenlegi].includes(hitelesitett)) {
    throw new Error("A visszatérítés állapota nem módosítható erre az értékre.");
  }
  return hitelesitett;
}

export function ellenorizFizetesiEgyezest(elvart: { merchantRef: string; osszegHuf: number; penznem: string }, kapott: { merchantRef: string; osszegHuf: number; penznem: string }): boolean {
  return Number.isSafeInteger(elvart.osszegHuf) && elvart.osszegHuf > 0
    && kapott.merchantRef === elvart.merchantRef
    && kapott.osszegHuf === elvart.osszegHuf
    && kapott.penznem === elvart.penznem;
}

export function ellenorizVisszateritesOsszeget(fizetettHuf: number, eddigiVisszateritesekHuf: number, kerelmezettHuf: number): boolean {
  return Number.isSafeInteger(fizetettHuf) && fizetettHuf > 0
    && Number.isSafeInteger(eddigiVisszateritesekHuf) && eddigiVisszateritesekHuf >= 0
    && Number.isSafeInteger(kerelmezettHuf) && kerelmezettHuf > 0
    && eddigiVisszateritesekHuf + kerelmezettHuf <= fizetettHuf;
}
