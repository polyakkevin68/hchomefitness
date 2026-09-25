"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type Tetel = { termekId: string; cikkszam: string; nev: string; mennyiseg: number; egysegarHuf: number | null; sorOsszegHuf: number | null; kaphato: boolean };
type Kosar = { verzio: number; tetelek: Tetel[]; szallitasiMod: string | null; termekOsszegHuf: number | null; szallitasHuf: number | null; fizetendoHuf: number | null; vasarlasEngedelyezett: boolean };
const huf = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 });

export default function KosarFelulete({ rendelesEngedelyezett }: { rendelesEngedelyezett: boolean }) {
  const [kosar, setKosar] = useState<Kosar | null>(null);
  const [hiba, setHiba] = useState("");
  const [betoltes, setBetoltes] = useState(true);
  const [kuldes, setKuldes] = useState(false);
  const [vevo, setVevo] = useState({ nev: "", email: "", telefon: "", iranyitoszam: "", telepules: "", cim: "" });
  const [hibaUzenet, setHibaUzenet] = useState("");
  const probalkozas = useRef<{ kulcs: string; ajanlatToken?: string } | null>(null);
  const frissit = useCallback(async () => {
    try {
      const response = await fetch("/api/kosar", { cache: "no-store" });
      const adat = await response.json();
      if (!response.ok) throw new Error(adat.hiba ?? "A kosár nem tölthető be.");
      setKosar(adat);
      setHiba("");
    } catch (error) { setHiba(error instanceof Error ? error.message : "A kosár nem tölthető be."); }
    finally { setBetoltes(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void frissit(), 0);
    return () => window.clearTimeout(timer);
  }, [frissit]);

  async function valtoztat(torzs: Record<string, unknown>, method: "PUT" | "DELETE" | "PATCH") {
    if (!kosar) return;
    const response = await fetch("/api/kosar", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ ...torzs, verzio: kosar.verzio }) });
    const adat = await response.json();
    if (!response.ok) { setHiba(adat.hiba ?? "A módosítás nem sikerült."); await frissit(); return; }
    setKosar(adat);
    setHiba("");
  }

  async function igenytKuldes(esemeny: FormEvent<HTMLFormElement>) {
    esemeny.preventDefault();
    if (!kosar || !rendelesEngedelyezett || !kosar.vasarlasEngedelyezett || kuldes) return;
    setKuldes(true);
    setHibaUzenet("");
    const alap = probalkozas.current ?? { kulcs: crypto.randomUUID() };
    probalkozas.current = alap;
    try {
      if (!alap.ajanlatToken) {
        const ajanlatValasz = await fetch("/api/penztar/ajanlat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ verzio: kosar.verzio }) });
        const ajanlat = await ajanlatValasz.json();
        if (!ajanlatValasz.ok) throw new Error(ajanlat.hiba ?? "Az ajánlat nem készíthető el.");
        alap.ajanlatToken = ajanlat.token;
      }
      const cim = { orszag: "HU", iranyitoszam: vevo.iranyitoszam, telepules: vevo.telepules, cim: vevo.cim };
      const rendelesValasz = await fetch("/api/rendeles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        ajanlatToken: alap.ajanlatToken, idempotenciaKulcs: alap.kulcs,
        vevo: { nev: vevo.nev, email: vevo.email, telefon: vevo.telefon }, szallitasiCim: cim,
      }) });
      const eredmeny = await rendelesValasz.json();
      if (!rendelesValasz.ok) throw new Error(eredmeny.hiba ?? "A rendelési igény nem menthető.");
      window.location.assign(`/rendeles/${eredmeny.rendeles.publicId}`);
    } catch (hiba) {
      setHibaUzenet(hiba instanceof Error ? hiba.message : "A rendelési igény elküldése nem sikerült.");
    } finally { setKuldes(false); }
  }

  function vevoModosit(mezo: keyof typeof vevo, ertek: string) {
    setVevo((elozo) => ({ ...elozo, [mezo]: ertek }));
    probalkozas.current = null;
  }

  return <section className="kosar-tartalom"><p className="eyebrow">VÁSÁRLÁS</p><h1>A kosarad</h1>{hiba && <p role="alert" className="kosar-hiba">{hiba}</p>}{betoltes && <p aria-live="polite">Kosár betöltése…</p>}{!betoltes && kosar && kosar.tetelek.length === 0 && <div className="empty-state"><h2>A kosarad még üres</h2><p>Nézz körül a HC Home Fitness kínálatában.</p><Link className="primary-button" href="/#katalogus">Termékek megtekintése</Link></div>}
    {!betoltes && kosar && kosar.tetelek.length > 0 && <div className="kosar-elrendezes"><div className="kosar-tetelek">{kosar.tetelek.map((tetel) => <article className="kosar-tetel" key={tetel.termekId}><div><span className="kosar-cikkszam">{tetel.cikkszam}</span><h2>{tetel.nev}</h2><p>{tetel.kaphato && tetel.egysegarHuf !== null ? huf.format(tetel.egysegarHuf) : "A termék jelenleg nem vásárolható"}</p></div><label>Mennyiség<select aria-label={`${tetel.nev} mennyisége`} value={tetel.mennyiseg} onChange={(e) => void valtoztat({ termekId: tetel.termekId, mennyiseg: Number(e.target.value) }, "PUT")}>{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></label><strong>{tetel.sorOsszegHuf === null ? "—" : huf.format(tetel.sorOsszegHuf)}</strong><button type="button" onClick={() => void valtoztat({ termekId: tetel.termekId }, "DELETE")}>Eltávolítás</button></article>)}</div><aside className="kosar-osszesito"><h2>Összesítés</h2><label>Szállítás módja<select value={kosar.szallitasiMod ?? ""} onChange={(e) => e.target.value && void valtoztat({ szallitasiMod: e.target.value }, "PATCH")}><option value="" disabled>Válassz szállítást</option><option value="hazhoz">Házhoz szállítás — 0 Ft</option><option value="emeletre">Emeletre szállítás — 19 900 Ft</option></select></label><div><span>Termékek</span><strong>{kosar.termekOsszegHuf === null ? "Ellenőrzés szükséges" : huf.format(kosar.termekOsszegHuf)}</strong></div><div><span>Szállítás</span><strong>{kosar.szallitasHuf === null ? "Válassz szállítást" : huf.format(kosar.szallitasHuf)}</strong></div><div className="kosar-fizetendo"><span>Fizetendő</span><strong>{kosar.fizetendoHuf === null ? "—" : huf.format(kosar.fizetendoHuf)}</strong></div>
      {!rendelesEngedelyezett ? <p>A rendelési igény fogadása jelenleg nincs bekapcsolva.</p> : !kosar.vasarlasEngedelyezett ? <p>Az egyik termék árát vagy vásárolhatóságát frissíteni kell az ajánlat előtt.</p> : <form className="rendeles-urlap" onSubmit={igenytKuldes}><h3>Szállítási és kapcsolattartási adatok</h3><label>Teljes név<input autoComplete="name" required minLength={2} maxLength={120} value={vevo.nev} onChange={(e) => vevoModosit("nev", e.target.value)} /></label><label>E-mail-cím<input type="email" autoComplete="email" required maxLength={254} value={vevo.email} onChange={(e) => vevoModosit("email", e.target.value)} /></label><label>Telefonszám<input type="tel" autoComplete="tel" required minLength={7} maxLength={24} value={vevo.telefon} onChange={(e) => vevoModosit("telefon", e.target.value)} /></label><label>Irányítószám<input inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{4}" required value={vevo.iranyitoszam} onChange={(e) => vevoModosit("iranyitoszam", e.target.value)} /></label><label>Település<input autoComplete="address-level2" required minLength={2} maxLength={100} value={vevo.telepules} onChange={(e) => vevoModosit("telepules", e.target.value)} /></label><label>Utca, házszám, emelet<input autoComplete="street-address" required minLength={3} maxLength={200} value={vevo.cim} onChange={(e) => vevoModosit("cim", e.target.value)} /></label>{hibaUzenet && <p className="kosar-hiba" role="alert">{hibaUzenet}</p>}<p>Ez rendelési igény. Fizetés nem történik; munkatársunk kézzel ellenőrzi a készletet, majd egyeztet veled.</p><button type="submit" disabled={kuldes}>{kuldes ? "Küldés…" : "Rendelési igény elküldése"}</button></form>}
    </aside></div>}
  </section>;
}
