"use client";

import { useEffect, useState, type FormEvent } from "react";

type Rendeles = { publicId: string; customerName: string; customerEmail: string; totalHuf: number; createdAt: string };
type Szamla = { id: string; provider: string; state: string; invoiceNumber: string | null; documentSha256: string | null; createdAt: string; order: { publicId: string; customerName: string; customerEmail: string; paymentState: string; totalHuf: number } };

export default function SzamlaKezelo() {
  const [email, setEmail] = useState("");
  const [jelszo, setJelszo] = useState("");
  const [belepve, setBelepve] = useState(false);
  const [rendelesek, setRendelesek] = useState<Rendeles[]>([]);
  const [szamlak, setSzamlak] = useState<Szamla[]>([]);
  const [pdfFajlok, setPdfFajlok] = useState<Record<string, File | null>>({});
  const [szamlaszamok, setSzamlaszamok] = useState<Record<string, string>>({});
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [betoltes, setBetoltes] = useState(false);
  async function frissit() {
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/szamlak", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba ?? "A számlalista nem tölthető be.");
      setRendelesek(data.szamlazhatoRendelesek); setSzamlak(data.szamlak); setBelepve(true);
    } catch (error) { setBelepve(false); setHiba(error instanceof Error ? error.message : "A számlalista nem tölthető be."); }
    finally { setBetoltes(false); }
  }
  useEffect(() => { let aktiv = true; fetch("/api/kezeles/szamlak", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, data: await r.json() })).then(({ ok, data }) => { if (aktiv && ok) { setRendelesek(data.szamlazhatoRendelesek); setSzamlak(data.szamlak); setBelepve(true); } }).catch(() => { if (aktiv) setHiba("A számlalista nem tölthető be."); }); return () => { aktiv = false; }; }, []);
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
  async function szamlatRogzit(event: FormEvent<HTMLFormElement>, rendeles: Rendeles) {
    event.preventDefault(); setBetoltes(true); setHiba(""); setUzenet("");
    const file = pdfFajlok[rendeles.publicId];
    if (!file) { setHiba("Válaszd ki az elkészült PDF-számlát."); setBetoltes(false); return; }
    const form = new FormData();
    form.set("rendelesAzonosito", rendeles.publicId);
    form.set("szamlaszam", szamlaszamok[rendeles.publicId] ?? "");
    form.set("pdf", file);
    try {
      const response = await fetch("/api/kezeles/szamlak", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.hiba ?? "A számla rögzítése nem sikerült.");
      setUzenet("A számlát elmentettük a védett tárba; a vásárlói értesítés bekerült a feldolgozási sorba.");
      await frissit();
    } catch (error) { setHiba(error instanceof Error ? error.message : "A számla rögzítése nem sikerült."); }
    finally { setBetoltes(false); }
  }
  async function kilepes() { await fetch("/api/kezeles/kijelentkezes", { method: "POST" }); setBelepve(false); setRendelesek([]); setSzamlak([]); }
  return <div>{!belepve ? <form className="muveleti-urlap" onSubmit={(event) => void belepes(event)}><label>E-mail-cím<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label><label>Jelszó<input type="password" autoComplete="current-password" value={jelszo} onChange={(event) => setJelszo(event.target.value)} required maxLength={256} /></label><button type="submit" disabled={betoltes}>Belépés</button></form> : <><button type="button" disabled={betoltes} onClick={() => void frissit()}>Lista frissítése</button><button type="button" disabled={betoltes} onClick={() => void kilepes()}>Kijelentkezés</button><h2>Rögzített számlák</h2>{szamlak.map((szamla) => <article className="muveleti-kartya" key={szamla.id}><p className="eyebrow">{szamla.order.publicId}</p><h3>{szamla.invoiceNumber ?? "Számlaszám nélkül"} · {szamla.state}</h3><p>{szamla.order.customerName} · {szamla.order.customerEmail}</p><p>PDF-lenyomat: {szamla.documentSha256}</p><a href={"/api/kezeles/szamlak/" + encodeURIComponent(szamla.id)}>Védett számla letöltése</a></article>)}<h2>Kifizetett rendelések, számla nélkül</h2>{rendelesek.map((rendeles) => <article className="muveleti-kartya" key={rendeles.publicId}><p className="eyebrow">{rendeles.publicId}</p><h3>{rendeles.customerName}</h3><p>{rendeles.customerEmail} · {new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(rendeles.totalHuf)}</p><form className="muveleti-urlap" onSubmit={(event) => void szamlatRogzit(event, rendeles)}><label>Külső számlaszám<input required maxLength={80} value={szamlaszamok[rendeles.publicId] ?? ""} onChange={(event) => setSzamlaszamok((old) => ({ ...old, [rendeles.publicId]: event.target.value }))} /></label><label>PDF-számla<input type="file" accept="application/pdf,.pdf" required onChange={(event) => setPdfFajlok((old) => ({ ...old, [rendeles.publicId]: event.target.files?.[0] ?? null }))} /></label><button type="submit" disabled={betoltes}>Külső számla biztonságos rögzítése</button></form></article>)}</>}{hiba && <p className="muveleti-hiba" role="alert">{hiba}</p>}{uzenet && <p role="status">{uzenet}</p>}</div>;
}
