"use client";

import { useEffect, useState, type FormEvent } from "react";

type Kupon = { id: string; kod: string; tipus: string; ertek: number; minimumHuf: number; maximumHuf: number | null; indulAt: string; lejarAt: string; felhasznalasiKeret: number | null; aktiv: boolean; kategoriak: string[]; cikkszamok: string[]; felhasznalasokSzama: number };
const uresUrlap = { kod: "", tipus: "SZAZALEK", ertek: "10", minimumHuf: "0", maximumHuf: "", indulAt: "", lejarAt: "", felhasznalasiKeret: "", osszevonhato: false, kategoriak: "", cikkszamok: "" };
const datum = (ertek: Date) => new Date(ertek.getTime() - ertek.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export default function KuponKezelo() {
  const [kuponok, setKuponok] = useState<Kupon[]>([]);
  const [urlap, setUrlap] = useState({ ...uresUrlap });
  const [uzenet, setUzenet] = useState("");
  const [hiba, setHiba] = useState("");
  const [betoltes, setBetoltes] = useState(false);

  async function frissit() {
    const response = await fetch("/api/kezeles/kuponok", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.hiba ?? "A kuponlista nem érhető el.");
    setKuponok(data.kuponok);
  }
  useEffect(() => { void Promise.resolve().then(() => {
    const most = new Date();
    setUrlap((elozo) => ({ ...elozo, indulAt: datum(most), lejarAt: datum(new Date(most.getTime() + 14 * 24 * 60 * 60_000)) }));
    return frissit();
  }).catch((error: unknown) => setHiba(error instanceof Error ? error.message : "A kuponlista nem érhető el.")); }, []);

  async function letrehoz(event: FormEvent) {
    event.preventDefault(); setBetoltes(true); setHiba(""); setUzenet("");
    try {
      const response = await fetch("/api/kezeles/kuponok", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        kod: urlap.kod, tipus: urlap.tipus, ertek: Number(urlap.ertek), minimumHuf: Number(urlap.minimumHuf), maximumHuf: urlap.maximumHuf ? Number(urlap.maximumHuf) : null,
        indulAt: new Date(urlap.indulAt).toISOString(), lejarAt: new Date(urlap.lejarAt).toISOString(), felhasznalasiKeret: urlap.felhasznalasiKeret ? Number(urlap.felhasznalasiKeret) : null,
        osszevonhato: urlap.osszevonhato, kategoriak: urlap.kategoriak.split(",").map((value) => value.trim()).filter(Boolean), cikkszamok: urlap.cikkszamok.split(",").map((value) => value.trim()).filter(Boolean),
      }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.hiba);
      setUrlap({ ...uresUrlap, indulAt: datum(new Date()), lejarAt: datum(new Date(Date.now() + 14 * 24 * 60 * 60_000)) });
      setUzenet("A kupon létrejött, kikapcsolt állapotban."); await frissit();
    } catch (error) { setHiba(error instanceof Error ? error.message : "A kupon mentése nem sikerült."); }
    finally { setBetoltes(false); }
  }

  async function allapotValt(kupon: Kupon) {
    setBetoltes(true); setHiba("");
    try { const response = await fetch("/api/kezeles/kuponok", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kuponId: kupon.id, aktiv: !kupon.aktiv }) }); const data = await response.json(); if (!response.ok) throw new Error(data.hiba); await frissit(); }
    catch (error) { setHiba(error instanceof Error ? error.message : "A kupon állapotváltása nem sikerült."); }
    finally { setBetoltes(false); }
  }

  return <div className="kupon-kezelo"><form className="kupon-urlap" onSubmit={letrehoz}><h2>Új kupon</h2><label>Kód<input required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" value={urlap.kod} onChange={(event) => setUrlap({ ...urlap, kod: event.target.value.toUpperCase() })} /></label><div className="kupon-ket-oszlop"><label>Kedvezmény típusa<select value={urlap.tipus} onChange={(event) => setUrlap({ ...urlap, tipus: event.target.value })}><option value="SZAZALEK">Százalék</option><option value="OSSZEG">Fix forintösszeg</option></select></label><label>Érték<input required type="number" min="1" max={urlap.tipus === "SZAZALEK" ? "100" : "99999999"} value={urlap.ertek} onChange={(event) => setUrlap({ ...urlap, ertek: event.target.value })} /></label></div><div className="kupon-ket-oszlop"><label>Minimum kosárérték (Ft)<input required type="number" min="0" value={urlap.minimumHuf} onChange={(event) => setUrlap({ ...urlap, minimumHuf: event.target.value })} /></label><label>Maximum kedvezmény (Ft)<input type="number" min="1" value={urlap.maximumHuf} onChange={(event) => setUrlap({ ...urlap, maximumHuf: event.target.value })} /></label></div><div className="kupon-ket-oszlop"><label>Kezdés<input required type="datetime-local" value={urlap.indulAt} onChange={(event) => setUrlap({ ...urlap, indulAt: event.target.value })} /></label><label>Lejárat<input required type="datetime-local" value={urlap.lejarAt} onChange={(event) => setUrlap({ ...urlap, lejarAt: event.target.value })} /></label></div><label>Felhasználási keret<input type="number" min="1" value={urlap.felhasznalasiKeret} onChange={(event) => setUrlap({ ...urlap, felhasznalasiKeret: event.target.value })} placeholder="Üresen korlátlan" /></label><label>Kategóriák, vesszővel elválasztva<input value={urlap.kategoriak} onChange={(event) => setUrlap({ ...urlap, kategoriak: event.target.value })} placeholder="Üresen minden termék" /></label><label>Cikkszámok, vesszővel elválasztva<input value={urlap.cikkszamok} onChange={(event) => setUrlap({ ...urlap, cikkszamok: event.target.value })} /></label><label className="kupon-jelolo"><input type="checkbox" checked={urlap.osszevonhato} onChange={(event) => setUrlap({ ...urlap, osszevonhato: event.target.checked })} />Más kedvezménnyel összevonható</label><button type="submit" disabled={betoltes}>Kupon mentése</button></form>
    {hiba && <p role="alert" className="kupon-hiba">{hiba}</p>}{uzenet && <p role="status">{uzenet}</p>}<h2>Mentett kuponok</h2>{kuponok.length === 0 ? <p>Nincs még kupon.</p> : <ul className="kupon-lista">{kuponok.map((kupon) => <li key={kupon.id}><div><strong>{kupon.kod}</strong><span>{kupon.tipus === "SZAZALEK" ? `${kupon.ertek}%` : `${kupon.ertek} Ft`} · {kupon.felhasznalasokSzama} foglalás/felhasználás</span><span>{new Date(kupon.indulAt).toLocaleString("hu-HU")} – {new Date(kupon.lejarAt).toLocaleString("hu-HU")}</span></div><button type="button" disabled={betoltes} onClick={() => void allapotValt(kupon)}>{kupon.aktiv ? "Kikapcsolás" : "Bekapcsolás"}</button></li>)}</ul>}</div>;
}
