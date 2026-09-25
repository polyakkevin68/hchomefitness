import { performance } from "node:perf_hooks";

const target = new URL(process.env.M8_TERHELES_CEL ?? "http://localhost:3100/api/katalogus");
if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || target.port !== "3100" || target.pathname !== "/api/katalogus") {
  throw new Error("Az M8 terhelésmérő kizárólag a helyi 3100-as katalógus API-t kérdezheti.");
}

const durationMs = Number(process.env.M8_TERHELES_IDO_MS ?? 600_000);
if (!Number.isInteger(durationMs) || durationMs < 10_000 || durationMs > 600_000) {
  throw new Error("A mérési idő 10 másodperc és 10 perc közötti egész érték legyen.");
}

const felhasznalokSzama = Number(process.env.M8_TERHELES_FELHASZNALOK ?? 50);
if (!Number.isInteger(felhasznalokSzama) || felhasznalokSzama < 1 || felhasznalokSzama > 50) {
  throw new Error("A párhuzamos felhasználók száma 1 és 50 közötti egész érték legyen.");
}
const varakozasMs = 10_000;
const meresKezdete = performance.now();
const meresVege = meresKezdete + durationMs;
const valaszidok: number[] = [];
let sikeres = 0;
let hibas = 0;
let atvittBajtok = 0;

const varakozik = (ido: number) => new Promise((resolve) => setTimeout(resolve, ido));

const felhasznalo = async (sorszam: number) => {
  await varakozik((sorszam % 10) * 100);
  while (performance.now() < meresVege) {
    const indulas = performance.now();
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(8_000) });
      const body = await response.text();
      const ido = performance.now() - indulas;
      valaszidok.push(ido);
      atvittBajtok += Buffer.byteLength(body, "utf8");
      const payload = JSON.parse(body) as { osszesTermekSzama?: number; termekek?: unknown[] };
      if (response.status === 200 && payload.osszesTermekSzama === 1_000 && Array.isArray(payload.termekek)) sikeres += 1;
      else hibas += 1;
    } catch {
      valaszidok.push(performance.now() - indulas);
      hibas += 1;
    }
    await varakozik(varakozasMs);
  }
};

async function main(): Promise<void> {
  const allapotJelento = setInterval(() => {
    const elteltMasodperc = Math.round((performance.now() - meresKezdete) / 1_000);
    console.info(`Terhelési próba: ${elteltMasodperc} mp; sikeres=${sikeres}; hibás=${hibas}.`);
  }, 60_000);

  try {
    await Promise.all(Array.from({ length: felhasznalokSzama }, (_, sorszam) => felhasznalo(sorszam)));
  } finally {
    clearInterval(allapotJelento);
  }

  valaszidok.sort((a, b) => a - b);
  const percentilis = (ertek: number) => valaszidok.length
    ? Math.round(valaszidok[Math.min(valaszidok.length - 1, Math.ceil(valaszidok.length * ertek) - 1)])
    : 0;
  const hibaArany = sikeres + hibas === 0 ? 1 : hibas / (sikeres + hibas);
  const eredmeny = {
    cel: target.origin,
    felhasznalok: felhasznalokSzama,
    idotartamMasodperc: Math.round((performance.now() - meresKezdete) / 1_000),
    sikeres,
    hibas,
    hibaSzazalek: Number((hibaArany * 100).toFixed(2)),
    p50Ms: percentilis(0.5),
    p95Ms: percentilis(0.95),
    p99Ms: percentilis(0.99),
    atvittMegabajt: Number((atvittBajtok / 1_000_000).toFixed(1)),
    celTeljesult: hibaArany < 0.01 && percentilis(0.95) < 500,
  };
  console.info(JSON.stringify(eredmeny, null, 2));
  if (!eredmeny.celTeljesult) process.exitCode = 1;
}

void main().catch((hiba: unknown) => {
  console.error(hiba instanceof Error ? hiba.message : "A terhelési mérés hibával leállt.");
  process.exitCode = 1;
});
