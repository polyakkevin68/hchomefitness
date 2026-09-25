"use client";

import { useEffect, useState, type FormEvent } from "react";

type Cim = { id: string; nev: string; iranyitoszam: string; telepules: string; cim: string; alapertelmezett: boolean };
type Rendeles = { publicId: string; status: string; paymentState: string; totalHuf: number; currency: string; createdAt: string };
type FiokAdat = { fiok: { nev: string; email: string }; cimek: Cim[]; rendelesek: Rendeles[] };
const huf = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 });

export default function FiokFelulete({ igazoloToken }: { igazoloToken: string }) {
  const [fiokAdat, setFiokAdat] = useState<FiokAdat | null>(null);
  const [mod, setMod] = useState<"belepes" | "regisztracio">("belepes");
  const [uzenet, setUzenet] = useState("");
  const [hiba, setHiba] = useState("");
  const [betoltes, setBetoltes] = useState(false);
  const [urlap, setUrlap] = useState({ nev: "", email: "", jelszo: "" });
  const [cim, setCim] = useState({ nev: "", iranyitoszam: "", telepules: "", cim: "", alapertelmezett: false });
  const [publicId, setPublicId] = useState("");

  async function fiokBetoltes() {
    const response = await fetch("/api/fiok", { cache: "no-store" });
    if (response.ok) setFiokAdat(await response.json());
    else setFiokAdat(null);
  }

  useEffect(() => {
    let ervenyes = true;
    void Promise.resolve().then(async () => {
      if (!igazoloToken) { await fiokBetoltes(); return; }
      setBetoltes(true);
      try {
        const response = await fetch("/api/fiok/igazolas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: igazoloToken }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.hiba);
        window.history.replaceState(null, "", "/fiok");
        if (ervenyes) setUzenet("Az e-mail-címed igazolva. Beléptettünk a fiókodba.");
        await fiokBetoltes();
      } catch (error) { if (ervenyes) setHiba(error instanceof Error ? error.message : "Az igazolás nem sikerült."); }
      finally { if (ervenyes) setBetoltes(false); }
    });
    return () => { ervenyes = false; };
  }, [igazoloToken]);

  async function kuldes(event: FormEvent) {
    event.preventDefault(); setHiba(""); setUzenet(""); setBetoltes(true);
    try {
      const vegpont = mod === "belepes" ? "/api/fiok/bejelentkezes" : "/api/fiok/regisztracio";
      const response = await fetch(vegpont, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(urlap) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba);
      if (mod === "regisztracio") setUzenet(data.uzenet);
      else { setUzenet("Sikeres belépés."); await fiokBetoltes(); }
    } catch (error) { setHiba(error instanceof Error ? error.message : "A kérés nem sikerült."); }
    finally { setBetoltes(false); }
  }

  async function kilepes() {
    await fetch("/api/fiok/kijelentkezes", { method: "POST" }); setFiokAdat(null); setUzenet("Sikeresen kijelentkeztél.");
  }

  async function cimMent(event: FormEvent) {
    event.preventDefault(); setHiba(""); setBetoltes(true);
    try { const response = await fetch("/api/fiok/cimek", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cim) }); const data = await response.json(); if (!response.ok) throw new Error(data.hiba); setCim({ nev: "", iranyitoszam: "", telepules: "", cim: "", alapertelmezett: false }); await fiokBetoltes(); }
    catch (error) { setHiba(error instanceof Error ? error.message : "A cím mentése nem sikerült."); }
    finally { setBetoltes(false); }
  }

  async function cimTorol(id: string) {
    const response = await fetch(`/api/fiok/cimek/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { setHiba("A cím törlése nem sikerült."); return; }
    await fiokBetoltes();
  }

  async function rendelesKapcsol(event: FormEvent) {
    event.preventDefault(); setHiba(""); setUzenet(""); setBetoltes(true);
    try { const response = await fetch("/api/fiok/korabbi-rendeles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.hiba); setPublicId(""); setUzenet("A rendelést a fiókhoz kapcsoltuk."); await fiokBetoltes(); }
    catch (error) { setHiba(error instanceof Error ? error.message : "A rendelés összekapcsolása nem sikerült."); }
    finally { setBetoltes(false); }
  }

  return <div className="fiok-felulete">
    {fiokAdat ? <><div className="fiok-fejlec"><div><h2>Szia, {fiokAdat.fiok.nev || fiokAdat.fiok.email}!</h2><p>{fiokAdat.fiok.email}</p></div><button type="button" onClick={() => void kilepes()}>Kijelentkezés</button></div>
      <section><h2>Saját rendeléseim</h2>{fiokAdat.rendelesek.length ? <ul className="fiok-rendelesek">{fiokAdat.rendelesek.map((rendeles) => <li key={rendeles.publicId}><div><strong>{rendeles.publicId}</strong><span>{new Date(rendeles.createdAt).toLocaleDateString("hu-HU")} · {rendeles.status}</span></div><strong>{huf.format(rendeles.totalHuf)}</strong></li>)}</ul> : <p>Még nincs a fiókhoz rendelt rendelés.</p>}
        <form className="fiok-urlap fiok-rendeles-kapcsolas" onSubmit={rendelesKapcsol}><h3>Korábbi vendégrendelés hozzákapcsolása</h3><p>Ehhez a rendelés visszaigazoló sütije és azonos e-mail-cím szükséges.</p><label>Rendelésazonosító<input required maxLength={27} value={publicId} onChange={(event) => setPublicId(event.target.value.toUpperCase())} placeholder="HC-20260925-ABCDEF123456" /></label><button type="submit" disabled={betoltes}>Rendelés összekapcsolása</button></form>
      </section>
      <section><h2>Címjegyzék</h2><ul className="fiok-cimek">{fiokAdat.cimek.map((item) => <li key={item.id}><div><strong>{item.nev} {item.alapertelmezett && <span>Alapértelmezett</span>}</strong><span>{item.iranyitoszam} {item.telepules}, {item.cim}</span></div><button type="button" onClick={() => void cimTorol(item.id)}>Törlés</button></li>)}</ul>
      <form className="fiok-urlap" onSubmit={cimMent}><h3>Új cím</h3><label>Név<input required minLength={2} maxLength={120} value={cim.nev} onChange={(e) => setCim({ ...cim, nev: e.target.value })} /></label><label>Irányítószám<input required inputMode="numeric" pattern="[0-9]{4}" value={cim.iranyitoszam} onChange={(e) => setCim({ ...cim, iranyitoszam: e.target.value })} /></label><label>Település<input required minLength={2} maxLength={100} value={cim.telepules} onChange={(e) => setCim({ ...cim, telepules: e.target.value })} /></label><label>Utca és házszám<input required minLength={3} maxLength={200} value={cim.cim} onChange={(e) => setCim({ ...cim, cim: e.target.value })} /></label><label className="fiok-jelolo"><input type="checkbox" checked={cim.alapertelmezett} onChange={(e) => setCim({ ...cim, alapertelmezett: e.target.checked })} />Legyen alapértelmezett</label><button type="submit" disabled={betoltes}>Cím mentése</button></form></section>
    </> : igazoloToken && betoltes ? <p role="status">Az e-mail-cím igazolása folyamatban…</p> : <><div className="fiok-valtogato"><button type="button" aria-pressed={mod === "belepes"} onClick={() => setMod("belepes")}>Belépés</button><button type="button" aria-pressed={mod === "regisztracio"} onClick={() => setMod("regisztracio")}>Fiók létrehozása</button></div>
      <form className="fiok-urlap" onSubmit={kuldes}>{mod === "regisztracio" && <label>Teljes név<input autoComplete="name" required minLength={2} maxLength={120} value={urlap.nev} onChange={(e) => setUrlap({ ...urlap, nev: e.target.value })} /></label>}<label>E-mail-cím<input type="email" autoComplete="email" required maxLength={254} value={urlap.email} onChange={(e) => setUrlap({ ...urlap, email: e.target.value })} /></label><label>Jelszó<input type="password" autoComplete={mod === "belepes" ? "current-password" : "new-password"} required minLength={mod === "belepes" ? 1 : 14} maxLength={256} value={urlap.jelszo} onChange={(e) => setUrlap({ ...urlap, jelszo: e.target.value })} /></label><button type="submit" disabled={betoltes}>{mod === "belepes" ? "Belépés" : "Fiók létrehozása"}</button></form><p className="fiok-vendeg">Fiók nélkül is vásárolhatsz vendégként.</p></>}
    {hiba && <p className="fiok-hiba" role="alert">{hiba}</p>}{uzenet && <p className="fiok-uzenet" role="status">{uzenet}</p>}
  </div>;
}
