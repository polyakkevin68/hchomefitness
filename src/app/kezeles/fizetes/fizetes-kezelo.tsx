"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Visszaterites = { id: string; amountHuf: number; reason: string; state: string; createdAt: string };
type Fizetes = { azonosito: string; vevo: string; email: string; osszegHuf: number; visszateritveHuf: number; visszateritesreFenntartvaHuf: number; visszaterithetoHuf: number; visszateritesek: Visszaterites[] };
const huf = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 });

export default function FizetesKezelo() {
  const [fizetesek, setFizetesek] = useState<Fizetes[]>([]);
  const [email, setEmail] = useState("");
  const [jelszo, setJelszo] = useState("");
  const [belepve, setBelepve] = useState(false);
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [betoltes, setBetoltes] = useState(true);
  const [urlapok, setUrlapok] = useState<Record<string, { osszeg: string; indok: string }>>({});

  const listaBetoltes = useCallback(async () => {
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/fizetes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setBelepve(false);
        if (response.status === 403) throw new Error("Ehhez a pénzügyi felülethez FINANCE vagy OWNER szerepkör szükséges.");
        throw new Error(data.hiba ?? "A fizetési lista nem tölthető be.");
      }
      setFizetesek(data.fizetesek); setBelepve(true);
    } catch (error) { setHiba(error instanceof Error ? error.message : "A fizetési lista nem tölthető be."); }
    finally { setBetoltes(false); }
  }, []);

  useEffect(() => {
    let aktiv = true;
    fetch("/api/kezeles/fizetes", { cache: "no-store" }).then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => {
      if (!aktiv) return;
      if (response.ok) { setFizetesek(data.fizetesek); setBelepve(true); }
      else { setBelepve(false); if (response.status === 403) setHiba("Ehhez a pénzügyi felülethez FINANCE vagy OWNER szerepkör szükséges."); }
    }).catch(() => { if (aktiv) setHiba("A fizetési lista nem tölthető be."); }).finally(() => { if (aktiv) setBetoltes(false); });
    return () => { aktiv = false; };
  }, []);

  async function belepes(esemeny: FormEvent<HTMLFormElement>) {
    esemeny.preventDefault(); setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/bejelentkezes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, jelszo }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba ?? "A belépés nem sikerült.");
      setJelszo(""); await listaBetoltes();
    } catch (error) { setHiba(error instanceof Error ? error.message : "A belépés nem sikerült."); }
    finally { setBetoltes(false); }
  }

  async function visszateritestIndit(esemeny: FormEvent<HTMLFormElement>, fizetes: Fizetes) {
    esemeny.preventDefault(); setBetoltes(true); setHiba(""); setUzenet("");
    const urlap = urlapok[fizetes.azonosito] ?? { osszeg: String(fizetes.visszaterithetoHuf), indok: "" };
    try {
      const response = await fetch("/api/kezeles/fizetes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ muvelet: "indit", rendelesAzonosito: fizetes.azonosito, osszegHuf: Number(urlap.osszeg), indok: urlap.indok, idempotenciaKulcs: crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(data.hiba ?? "A visszatérítés nem indítható.");
      setUzenet(data.visszaterites?.allapot === "UNKNOWN" ? "A visszatérítés eredménye bizonytalan; ne indítsd újra." : "A visszatérítési kérést rögzítettük.");
      await listaBetoltes();
    } catch (error) { setHiba(error instanceof Error ? error.message : "A visszatérítés nem indítható."); }
    finally { setBetoltes(false); }
  }

  async function visszateritestEgyeztet(visszateritesId: string) {
    setBetoltes(true); setHiba(""); setUzenet("");
    try {
      const response = await fetch("/api/kezeles/fizetes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ muvelet: "egyeztet", visszateritesId }) });
      const data = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(data.hiba ?? "Az egyeztetés nem sikerült.");
      setUzenet(data.visszaterites?.allapot === "UNKNOWN" ? "A szolgáltatói adatokból még nem dönthető el az eredmény." : `Egyeztetett állapot: ${data.visszaterites.allapot}.`);
      await listaBetoltes();
    } catch (error) { setHiba(error instanceof Error ? error.message : "Az egyeztetés nem sikerült."); }
    finally { setBetoltes(false); }
  }

  return <div className="fizetes-kezelo">{!belepve ? <form className="muveleti-urlap" onSubmit={(event) => void belepes(event)}><label>E-mail-cím<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label><label>Jelszó<input type="password" autoComplete="current-password" value={jelszo} onChange={(event) => setJelszo(event.target.value)} required maxLength={256} /></label><button type="submit" disabled={betoltes}>Belépés</button></form> : <><button type="button" onClick={() => void listaBetoltes()} disabled={betoltes}>Lista frissítése</button>{fizetesek.length === 0 && <p>Nincs visszatéríthető SimplePay-fizetés.</p>}{fizetesek.map((fizetes) => <article className="fizetes-kartya" key={fizetes.azonosito}><p className="eyebrow">{fizetes.azonosito}</p><h2>{fizetes.vevo}</h2><p>{fizetes.email}</p><p>Fizetve: {huf.format(fizetes.osszegHuf)} · Visszatérítve: {huf.format(fizetes.visszateritveHuf)} · Még visszatéríthető: {huf.format(fizetes.visszaterithetoHuf)}</p>{fizetes.visszateritesek.length > 0 && <ul>{fizetes.visszateritesek.map((refund) => <li key={refund.id}>{huf.format(refund.amountHuf)} · {refund.state} · {refund.reason}{["UNKNOWN", "REQUESTED"].includes(refund.state) && <button type="button" disabled={betoltes} onClick={() => void visszateritestEgyeztet(refund.id)}>Állapot egyeztetése</button>}</li>)}</ul>}{fizetes.visszaterithetoHuf > 0 && <form onSubmit={(event) => void visszateritestIndit(event, fizetes)}><label>Visszatérítendő összeg (Ft)<input type="number" min="1" max={fizetes.visszaterithetoHuf} step="1" required value={urlapok[fizetes.azonosito]?.osszeg ?? String(fizetes.visszaterithetoHuf)} onChange={(event) => setUrlapok((previous) => ({ ...previous, [fizetes.azonosito]: { osszeg: event.target.value, indok: previous[fizetes.azonosito]?.indok ?? "" } }))} /></label><label>Indoklás<textarea minLength={10} maxLength={500} required value={urlapok[fizetes.azonosito]?.indok ?? ""} onChange={(event) => setUrlapok((previous) => ({ ...previous, [fizetes.azonosito]: { osszeg: previous[fizetes.azonosito]?.osszeg ?? String(fizetes.visszaterithetoHuf), indok: event.target.value } }))} /></label><button type="submit" disabled={betoltes}>Visszatérítés indítása</button></form>}</article>)}</>}{hiba && <p role="alert" className="muveleti-hiba">{hiba}</p>}{uzenet && <p role="status">{uzenet}</p>}</div>;
}
