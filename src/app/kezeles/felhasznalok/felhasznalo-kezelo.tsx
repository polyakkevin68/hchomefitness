"use client";

import { useEffect, useState, type FormEvent } from "react";

type Felhasznalo = { id: string; email: string; role: string; isActive: boolean; createdAt: string };
const szerepkorok = [
  ["OPERATIONS", "Rendeléskezelő"], ["FINANCE", "Pénzügyi munkatárs"], ["CONTENT", "Tartalomkezelő"], ["READ_ONLY", "Csak olvasás"],
] as const;

export default function FelhasznaloKezelo() {
  const [felhasznalok, setFelhasznalok] = useState<Felhasznalo[]>([]);
  const [email, setEmail] = useState("");
  const [jelszo, setJelszo] = useState("");
  const [szerepkor, setSzerepkor] = useState<(typeof szerepkorok)[number][0]>("OPERATIONS");
  const [betoltes, setBetoltes] = useState(false);
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");

  async function frissit() {
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/felhasznalok", { cache: "no-store" });
      const adat = await response.json();
      if (!response.ok) throw new Error(adat.hiba ?? "A fióklista nem tölthető be.");
      setFelhasznalok(adat.felhasznalok);
    } catch (hiba) { setHiba(hiba instanceof Error ? hiba.message : "A fióklista nem tölthető be."); }
    finally { setBetoltes(false); }
  }

  useEffect(() => { const id = window.setTimeout(() => { void frissit(); }, 0); return () => window.clearTimeout(id); }, []);

  async function letrehoz(esemeny: FormEvent<HTMLFormElement>) {
    esemeny.preventDefault(); setBetoltes(true); setHiba(""); setUzenet("");
    try {
      const response = await fetch("/api/kezeles/felhasznalok", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, jelszo, szerepkor }) });
      const adat = await response.json();
      if (!response.ok) throw new Error(adat.hiba ?? "A fiók nem hozható létre.");
      setEmail(""); setJelszo(""); setUzenet("A kezelői fiók elkészült."); await frissit();
    } catch (hiba) { setHiba(hiba instanceof Error ? hiba.message : "A fiók nem hozható létre."); }
    finally { setBetoltes(false); }
  }

  async function allapotvalt(felhasznalo: Felhasznalo) {
    setBetoltes(true); setHiba(""); setUzenet("");
    try {
      const response = await fetch("/api/kezeles/felhasznalok", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ felhasznaloId: felhasznalo.id, aktiv: !felhasznalo.isActive }) });
      const adat = await response.json();
      if (!response.ok) throw new Error(adat.hiba ?? "A fiók állapota nem módosítható.");
      setUzenet(adat.felhasznalo.isActive ? "A fiók ismét aktív." : "A fiók letiltva; a munkamenetei visszavonva."); await frissit();
    } catch (hiba) { setHiba(hiba instanceof Error ? hiba.message : "A fiók állapota nem módosítható."); }
    finally { setBetoltes(false); }
  }

  return <div className="fiokkezelo">
    <form className="muveleti-urlap" onSubmit={(esemeny) => void letrehoz(esemeny)}>
      <h2>Új fiók</h2>
      <label>E-mail-cím<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(esemeny) => setEmail(esemeny.target.value)} /></label>
      <label>Ideiglenes jelszó<input type="password" autoComplete="new-password" required minLength={14} maxLength={256} value={jelszo} onChange={(esemeny) => setJelszo(esemeny.target.value)} /><span>Legalább 14 karakter. A jelszót egyszer add át biztonságos csatornán.</span></label>
      <label>Szerepkör<select value={szerepkor} onChange={(esemeny) => setSzerepkor(esemeny.target.value as typeof szerepkor)}>{szerepkorok.map(([ertek, nev]) => <option key={ertek} value={ertek}>{nev}</option>)}</select></label>
      <button type="submit" disabled={betoltes}>Fiók létrehozása</button>
    </form>
    <div className="fiokkezelo-fejlec"><h2>Meglévő fiókok</h2><button type="button" disabled={betoltes} onClick={() => void frissit()}>Frissítés</button></div>
    {hiba && <p className="muveleti-hiba" role="alert">{hiba}</p>}{uzenet && <p className="fiokkezelo-uzenet" role="status">{uzenet}</p>}
    <ul className="fioklista">{felhasznalok.map((felhasznalo) => <li key={felhasznalo.id}><div><strong>{felhasznalo.email}</strong><span>{felhasznalo.role === "OWNER" ? "Tulajdonos" : szerepkorok.find(([ertek]) => ertek === felhasznalo.role)?.[1] ?? felhasznalo.role} · {felhasznalo.isActive ? "Aktív" : "Letiltva"}</span><time dateTime={felhasznalo.createdAt}>{new Date(felhasznalo.createdAt).toLocaleDateString("hu-HU")}</time></div>{felhasznalo.role !== "OWNER" && <button type="button" disabled={betoltes} onClick={() => void allapotvalt(felhasznalo)}>{felhasznalo.isActive ? "Letiltás" : "Újraaktiválás"}</button>}</li>)}</ul>
  </div>;
}
