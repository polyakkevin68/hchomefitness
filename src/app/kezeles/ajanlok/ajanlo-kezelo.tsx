"use client";

import { useEffect, useState, type FormEvent } from "react";

type Ajanlo = { id: string; aktiv: boolean; forrasTermek: { slug: string; sku: string; name: string }; celTermek: { slug: string; sku: string; name: string } };
export default function AjanloKezelo() {
  const [ajanlok, setAjanlok] = useState<Ajanlo[]>([]);
  const [forrasSlug, setForrasSlug] = useState("");
  const [celSlug, setCelSlug] = useState("");
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [betoltes, setBetoltes] = useState(false);
  async function frissit() { const response = await fetch("/api/kezeles/ajanlok", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.hiba); setAjanlok(data.ajanlok); }
  useEffect(() => { void Promise.resolve().then(() => frissit().catch((error: unknown) => setHiba(error instanceof Error ? error.message : "A lista nem érhető el."))); }, []);
  async function ment(event: FormEvent) { event.preventDefault(); setBetoltes(true); setHiba(""); setUzenet(""); try { const response = await fetch("/api/kezeles/ajanlok", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ forrasSlug, celSlug }) }); const data = await response.json(); if (!response.ok) throw new Error(data.hiba); setForrasSlug(""); setCelSlug(""); setUzenet("Az ajánló létrejött, kikapcsolt állapotban."); await frissit(); } catch (error) { setHiba(error instanceof Error ? error.message : "Az ajánló mentése nem sikerült."); } finally { setBetoltes(false); } }
  async function valtas(ajanlo: Ajanlo) { setBetoltes(true); setHiba(""); try { const response = await fetch("/api/kezeles/ajanlok", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ajanloId: ajanlo.id, aktiv: !ajanlo.aktiv }) }); const data = await response.json(); if (!response.ok) throw new Error(data.hiba); await frissit(); } catch (error) { setHiba(error instanceof Error ? error.message : "Az ajánló állapota nem menthető."); } finally { setBetoltes(false); } }
  return <div className="ajanlo-kezelo"><form className="ajanlo-urlap" onSubmit={ment}><label>Forrás termék slugja<input required maxLength={160} value={forrasSlug} onChange={(event) => setForrasSlug(event.target.value)} placeholder="futopad-hc-01" /></label><label>Ajánlott termék slugja<input required maxLength={160} value={celSlug} onChange={(event) => setCelSlug(event.target.value)} placeholder="szonyeg-hc-01" /></label><button type="submit" disabled={betoltes}>Ajánló létrehozása</button></form>{hiba && <p role="alert">{hiba}</p>}{uzenet && <p role="status">{uzenet}</p>}<ul className="ajanlo-lista">{ajanlok.map((ajanlo) => <li key={ajanlo.id}><div><strong>{ajanlo.forrasTermek.name} → {ajanlo.celTermek.name}</strong><span>{ajanlo.forrasTermek.sku} → {ajanlo.celTermek.sku}</span></div><button type="button" disabled={betoltes} onClick={() => void valtas(ajanlo)}>{ajanlo.aktiv ? "Kikapcsolás" : "Bekapcsolás"}</button></li>)}</ul></div>;
}
