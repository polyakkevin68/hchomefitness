import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const kulcsHossz = 64;
const scryptN = 16_384;
const scryptR = 8;
const scryptP = 1;
const jelszoMinimum = 14;

function scrypt(jelszo: string, so: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(jelszo, so, kulcsHossz, { N: scryptN, r: scryptR, p: scryptP, maxmem: 64 * 1024 * 1024 }, (hiba, eredmeny) => {
      if (hiba) reject(hiba);
      else resolve(eredmeny as Buffer);
    });
  });
}

export async function hashAdminJelszot(jelszo: string): Promise<string> {
  if (jelszo.length < jelszoMinimum || jelszo.length > 256) throw new Error(`A jelszó legalább ${jelszoMinimum} karakteres legyen.`);
  const so = randomBytes(16).toString("base64url");
  const hash = await scrypt(jelszo, so);
  return `scrypt$${scryptN}$${scryptR}$${scryptP}$${so}$${hash.toString("base64url")}`;
}

export async function ellenorizAdminJelszot(jelszo: string, tarolt: string): Promise<boolean> {
  if (jelszo.length > 256) return false;
  const reszek = tarolt.split("$");
  if (reszek.length !== 6 || reszek[0] !== "scrypt" || reszek[1] !== String(scryptN)
    || reszek[2] !== String(scryptR) || reszek[3] !== String(scryptP)
    || !/^[A-Za-z0-9_-]{22}$/.test(reszek[4]) || !/^[A-Za-z0-9_-]{86}$/.test(reszek[5])) return false;
  try {
    const kapott = await scrypt(jelszo, reszek[4]);
    const vart = Buffer.from(reszek[5], "base64url");
    return vart.length === kapott.length && timingSafeEqual(vart, kapott);
  } catch { return false; }
}

export function ujAdminToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAdminToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
