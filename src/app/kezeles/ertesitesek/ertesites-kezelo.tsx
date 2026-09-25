"use client";

import { useEffect, useState, type FormEvent } from "react";

type Ertesites = { id: string; type: string; allapot: string; probalkozasok: number; szolgaltatoiUzenet: string | null; hiba: string | null; elkuldveAt: string | null; frissitveAt: string; rendelesAzonosito: string; cimzett: string };

export default function ErtesitesKezelo() {
  const [email, setEmail] = useState("");
  const [jelszo, setJelszo] = useState("");
  const [belepve, setBelepve] = useState(false);
  const [sorok, setSorok] = useState<Ertesites[]>([]);
  const [hiba, setHiba] = useState("");
  const [betoltes, setBetoltes] = useState(false);
  async function frissit() {
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/ertesitesek", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba ?? "Az értesítési lista nem tölthető be.");
      setSorok(data.ertesitesek); setBelepve(true);
    } catch (error) { setBelepve(false); setHiba(error instanceof Error ? error.message : "A lista nem tölthető be."); }
    finally { setBetoltes(false); }
  }
  useEffect(() => { let aktiv = true; fetch("/api/kezeles/ertesitesek", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, data: await r.json() })).then(({ ok, data }) => { if (aktiv && ok) { setSorok(data.ertesitesek); setBelepve(true); } }).catch(() => { if (aktiv) setHiba("Az értesítési lista nem tölthető be."); }); return () => { aktiv = false; }; }, []);
  async function belepes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/bejelentkezes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, jelszo }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba ?? "A belépés nem sikerült.");
      setJelszo(""); await frissit();
    } catch (error) { setHiba(error instanceof Error ? error.message : "A belépés nem sikerült."); }
    finally { setBetoltes(false); }
  }
  async function ujraprobal(id: string) {
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/ertesitesek", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ muvelet: "ujraprobal", ertesitesId: id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba ?? "Az értesítés nem indítható újra.");
      await frissit();
    } catch (error) { setHiba(error instanceof Error ? error.message : "Az értesítés nem indítható újra."); }
    finally { setBetoltes(false); }
  }
  async function kilepes() { await fetch("/api/kezeles/kijelentkezes", { method: "POST" }); setBelepve(false); setSorok([]); }
  return <div>{!belepve ? <form className="muveleti-urlap" onSubmit={(event) => void belepes(event)}><label>E-mail-cím<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label><label>Jelszó<input type="password" autoComplete="current-password" value={jelszo} onChange={(event) => setJelszo(event.target.value)} required maxLength={256} /></label><button type="submit" disabled={betoltes}>Belépés</button></form> : <><button type="button" disabled={betoltes} onClick={() => void frissit()}>Lista frissítése</button><button type="button" disabled={betoltes} onClick={() => void kilepes()}>Kijelentkezés</button>{sorok.length === 0 && <p>Nincs függő vagy naplózott értesítés.</p>}{sorok.map((sor) => <article className="muveleti-kartya" key={sor.id}><p className="eyebrow">{sor.rendelesAzonosito} · {sor.type}</p><h2>{sor.allapot}</h2><p>Címzett: {sor.cimzett}</p><p>Próbálkozások: {sor.probalkozasok} · Utolsó módosítás: {new Date(sor.frissitveAt).toLocaleString("hu-HU")}</p>{sor.szolgaltatoiUzenet && <p>Szolgáltatói azonosító: {sor.szolgaltatoiUzenet}</p>}{sor.hiba && <p role="alert">{sor.hiba}</p>}{sor.allapot === "FAILED" && <button type="button" disabled={betoltes} onClick={() => void ujraprobal(sor.id)}>Újrapróbálás</button>}</article>)}</>}{hiba && <p className="muveleti-hiba" role="alert">{hiba}</p>}</div>;
}
