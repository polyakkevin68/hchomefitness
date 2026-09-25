"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { huf } from "@/lib/penzformazas";

type Keszlet = { allapot: "friss"; mennyiseg: number } | { allapot: "elavult" | "ismeretlen" };
type Termek = { id: string; sku: string; slug: string; name: string; category: string; priceHuf: number; isPurchasable: boolean; isPublished: boolean; keszlet: Keszlet };

export default function TermekJovahagyas() {
  const [termekek, setTermekek] = useState<Termek[]>([]);
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [betoltes, setBetoltes] = useState(true);
  const betolt = useCallback(async () => {
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/termekek", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba ?? "A terméklista nem érhető el.");
      setTermekek(data.termekek);
    } catch (error) { setHiba(error instanceof Error ? error.message : "A terméklista nem érhető el."); }
    finally { setBetoltes(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(betolt); }, [betolt]);

  async function allapotValt(termek: Termek) {
    const publikalt = !termek.isPublished;
    const kerdes = publikalt
      ? `Közzéteszed a(z) ${termek.name} terméket? A nyilvános katalógusban megjelenik.`
      : `Elrejted a(z) ${termek.name} terméket a nyilvános katalógusból?`;
    if (!window.confirm(kerdes)) return;
    setBetoltes(true); setHiba(""); setUzenet("");
    try {
      const response = await fetch("/api/kezeles/termekek", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ termekId: termek.id, publikalt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba ?? "A termék állapotát nem sikerült menteni.");
      setUzenet(publikalt ? `${termek.sku} termék közzétéve.` : `${termek.sku} termék elrejtve.`);
      await betolt();
    } catch (error) { setHiba(error instanceof Error ? error.message : "A termék állapotát nem sikerült menteni."); setBetoltes(false); }
  }

  if (betoltes && termekek.length === 0 && !hiba) return <p role="status">Terméklista betöltése…</p>;
  return <div className="termek-jovahagyas">
    <div className="termek-jovahagyas-fejlec"><p>{termekek.length} ellenőrizhető HC/UNAS-termék</p><button type="button" onClick={() => void betolt()} disabled={betoltes}>Frissítés</button></div>
    {hiba && <p role="alert" className="termek-jovahagyas-hiba">{hiba}</p>}
    {uzenet && <p role="status" className="termek-jovahagyas-uzenet">{uzenet}</p>}
    {termekek.length === 0 && !hiba ? <p>Nincs importált, jóváhagyható termék.</p> : <ul className="termek-jovahagyas-lista">{termekek.map((termek) => <li key={termek.id}>
      <div className="termek-jovahagyas-adat"><strong>{termek.name}</strong><span>{termek.sku} · {termek.category}</span><span>{huf.format(termek.priceHuf)} · {termek.isPurchasable ? "a forrás szerint rendelhető" : "a forrás szerint nem rendelhető"}</span><span className={termek.keszlet.allapot === "friss" ? "keszlet-friss" : "keszlet-nem-friss"}>{termek.keszlet.allapot === "friss" ? `Friss készlet: ${termek.keszlet.mennyiseg} db` : termek.keszlet.allapot === "elavult" ? "A készletadat elavult" : "A készlet nem ismert"}</span></div>
      <div className="termek-jovahagyas-gombok"><Link href={`/termek/${termek.slug}`} target="_blank" rel="noreferrer">Előnézet</Link><button type="button" disabled={betoltes} onClick={() => void allapotValt(termek)}>{termek.isPublished ? "Elrejtés" : "Közzététel"}</button><span>{termek.isPublished ? "Közzétéve" : "Vázlat"}</span></div>
    </li>)}</ul>}
  </div>;
}
