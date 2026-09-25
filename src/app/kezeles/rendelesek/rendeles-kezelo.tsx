"use client";

import { useEffect, useState, type FormEvent } from "react";

type Tetel = { nev?: string; cikkszam?: string; mennyiseg?: number; sorOsszegHuf?: number };
type Szallitas = { state: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null };
type Rendeles = { id: string; publicId: string; status: string; paymentState: string; customerName: string; customerEmail: string; customerPhone: string; addressSnapshot: { szallitasiCim?: { iranyitoszam?: string; telepules?: string; cim?: string } }; itemSnapshots: Tetel[]; totalHuf: number; createdAt: string; shipment: Szallitas | null; events: { fromStatus: string; toStatus: string; actor: string; note: string; createdAt: string }[] };
type SzallitasBemenet = { futar: string; kovetesiSzam: string; kovetesiUrl: string };
const huf = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 });
const allapotNev: Record<string, string> = { PENDING_CONFIRMATION: "Készletellenőrzésre vár", CONFIRMED: "Készlet visszaigazolva", REJECTED: "Nem elérhető", UNPAID: "Fizetésre vár", PAID: "Kifizetve", FAILED: "Sikertelen", EXPIRED: "Lejárt", PENDING: "Előkészítésre vár", PROCESSING: "Előkészítés folyamatban", SHIPPED: "Feladva", DELIVERED: "Kézbesítve", CANCELLED: "Megszakítva", shipment_processing: "Teljesítés elkezdve", shipment_shipped: "Feladva", shipment_delivered: "Kézbesítve", shipment_cancelled: "Teljesítés megszakítva" };

export default function RendelesKezelo() {
  const [email, setEmail] = useState("");
  const [jelszo, setJelszo] = useState("");
  const [belepve, setBelepve] = useState(false);
  const [rendelesek, setRendelesek] = useState<Rendeles[]>([]);
  const [megjegyzesek, setMegjegyzesek] = useState<Record<string, string>>({});
  const [szallitasok, setSzallitasok] = useState<Record<string, SzallitasBemenet>>({});
  const [hiba, setHiba] = useState("");
  const [betoltes, setBetoltes] = useState(false);
  useEffect(() => {
    void fetch("/api/kezeles/munkamenet", { cache: "no-store" }).then((response) => setBelepve(response.ok)).catch(() => setBelepve(false));
  }, []);
  async function listaBetoltes() {
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/rendeles", { cache: "no-store" });
      const adat = await response.json();
      if (!response.ok) throw new Error(adat.hiba ?? "A lista nem tölthető be.");
      setRendelesek(adat.rendelesek);
    } catch (hiba) { setHiba(hiba instanceof Error ? hiba.message : "A lista nem tölthető be."); }
    finally { setBetoltes(false); }
  }
  async function belepes(esemeny: FormEvent<HTMLFormElement>) {
    esemeny.preventDefault(); setBetoltes(true); setHiba("");
    try {
      const response = await fetch("/api/kezeles/bejelentkezes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, jelszo }) });
      const adat = await response.json();
      if (!response.ok) throw new Error(adat.hiba ?? "A belépés nem sikerült.");
      setBelepve(true); setJelszo(""); await listaBetoltes();
    } catch (hiba) { setHiba(hiba instanceof Error ? hiba.message : "A belépés nem sikerült."); }
    finally { setBetoltes(false); }
  }
  async function kilepes() {
    setBetoltes(true);
    try { await fetch("/api/kezeles/kijelentkezes", { method: "POST" }); }
    finally { setBelepve(false); setRendelesek([]); setBetoltes(false); }
  }
  async function keszletDontes(publicId: string, muvelet: "megerosit" | "elutasit") {
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch(`/api/kezeles/rendeles/${publicId}/keszlet`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ muvelet, megjegyzes: megjegyzesek[publicId] ?? "" }) });
      const adat = await response.json();
      if (!response.ok) throw new Error(adat.hiba ?? "A döntés nem menthető.");
      setRendelesek((elozo) => elozo.filter((rendeles) => rendeles.publicId !== publicId));
    } catch (hiba) { setHiba(hiba instanceof Error ? hiba.message : "A döntés nem menthető."); }
    finally { setBetoltes(false); }
  }
  async function frissitSzallitast(publicId: string, allapot: "PROCESSING" | "SHIPPED" | "DELIVERED") {
    const adat = szallitasok[publicId] ?? { futar: "", kovetesiSzam: "", kovetesiUrl: "" };
    setBetoltes(true); setHiba("");
    try {
      const response = await fetch(`/api/kezeles/rendeles/${publicId}/szallitas`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ allapot, ...adat, idempotenciaKulcs: crypto.randomUUID().replaceAll("-", "") }) });
      const valasz = await response.json();
      if (!response.ok) throw new Error(valasz.hiba ?? "A szállítási állapot nem menthető.");
      await listaBetoltes();
    } catch (hiba) { setHiba(hiba instanceof Error ? hiba.message : "A szállítási állapot nem menthető."); }
    finally { setBetoltes(false); }
  }
  return <div>{!belepve ? <form className="muveleti-urlap" onSubmit={(esemeny) => void belepes(esemeny)}><label>E-mail-cím<input type="email" autoComplete="username" value={email} onChange={(esemeny) => setEmail(esemeny.target.value)} required maxLength={254} /></label><label>Jelszó<input type="password" autoComplete="current-password" value={jelszo} onChange={(esemeny) => setJelszo(esemeny.target.value)} required maxLength={256} /></label><button type="submit" disabled={betoltes}>{betoltes ? "Belépés…" : "Belépés a kezelőfelületre"}</button></form> : <><button type="button" disabled={betoltes} onClick={() => void listaBetoltes()}>Rendelések frissítése</button><button type="button" disabled={betoltes} onClick={() => void kilepes()}>Kijelentkezés</button>{rendelesek.length === 0 && <p>Nincs megjelenített rendelés.</p>}</>}{hiba && <p className="muveleti-hiba" role="alert">{hiba}</p>}{rendelesek.map((rendeles) => <article className="muveleti-kartya" key={rendeles.id}><p className="eyebrow">{rendeles.publicId} · {new Date(rendeles.createdAt).toLocaleString("hu-HU")}</p><h2>{rendeles.customerName}</h2><p>{rendeles.customerEmail}<br />{rendeles.customerPhone}</p><p>{rendeles.addressSnapshot.szallitasiCim?.iranyitoszam} {rendeles.addressSnapshot.szallitasiCim?.telepules}, {rendeles.addressSnapshot.szallitasiCim?.cim}</p><ul>{rendeles.itemSnapshots.map((tetel, index) => <li key={`${tetel.cikkszam}-${index}`}>{tetel.nev} · {tetel.mennyiseg} db · {huf.format(tetel.sorOsszegHuf ?? 0)}</li>)}</ul><strong>Összesen: {huf.format(rendeles.totalHuf)}</strong><p>Rendelési állapot: {allapotNev[rendeles.status] ?? rendeles.status} · Fizetés: {allapotNev[rendeles.paymentState] ?? rendeles.paymentState}</p>{rendeles.status === "PENDING_CONFIRMATION" ? <><label className="muveleti-urlap">Ellenőrzés eredménye<textarea minLength={10} maxLength={500} required value={megjegyzesek[rendeles.publicId] ?? ""} onChange={(esemeny) => setMegjegyzesek((elozo) => ({ ...elozo, [rendeles.publicId]: esemeny.target.value }))} placeholder="Például: készlet kézzel ellenőrizve" /></label><div className="muveleti-gombok"><button type="button" disabled={betoltes} onClick={() => void keszletDontes(rendeles.publicId, "megerosit")}>Készlet visszaigazolása</button><button type="button" disabled={betoltes} onClick={() => void keszletDontes(rendeles.publicId, "elutasit")}>Nem elérhető</button></div></> : rendeles.status === "CONFIRMED" ? <><p>Teljesítés: {allapotNev[rendeles.shipment?.state ?? "PENDING"] ?? rendeles.shipment?.state}</p>{!rendeles.shipment || rendeles.shipment.state === "PENDING" ? <button type="button" disabled={betoltes} onClick={() => void frissitSzallitast(rendeles.publicId, "PROCESSING")}>Teljesítés elkezdése</button> : null}{rendeles.shipment?.state === "PROCESSING" && <><label>Futárszolgálat<input value={szallitasok[rendeles.publicId]?.futar ?? rendeles.shipment.carrier ?? ""} onChange={(e) => setSzallitasok((elozo) => ({ ...elozo, [rendeles.publicId]: { ...elozo[rendeles.publicId], futar: e.target.value, kovetesiSzam: elozo[rendeles.publicId]?.kovetesiSzam ?? rendeles.shipment?.trackingNumber ?? "", kovetesiUrl: elozo[rendeles.publicId]?.kovetesiUrl ?? rendeles.shipment?.trackingUrl ?? "" } }))} /></label><label>Követési szám<input value={szallitasok[rendeles.publicId]?.kovetesiSzam ?? rendeles.shipment.trackingNumber ?? ""} onChange={(e) => setSzallitasok((elozo) => ({ ...elozo, [rendeles.publicId]: { ...elozo[rendeles.publicId], futar: elozo[rendeles.publicId]?.futar ?? rendeles.shipment?.carrier ?? "", kovetesiSzam: e.target.value, kovetesiUrl: elozo[rendeles.publicId]?.kovetesiUrl ?? rendeles.shipment?.trackingUrl ?? "" } }))} /></label><label>Követési hivatkozás<input type="url" value={szallitasok[rendeles.publicId]?.kovetesiUrl ?? rendeles.shipment.trackingUrl ?? ""} onChange={(e) => setSzallitasok((elozo) => ({ ...elozo, [rendeles.publicId]: { ...elozo[rendeles.publicId], futar: elozo[rendeles.publicId]?.futar ?? rendeles.shipment?.carrier ?? "", kovetesiSzam: elozo[rendeles.publicId]?.kovetesiSzam ?? rendeles.shipment?.trackingNumber ?? "", kovetesiUrl: e.target.value } }))} /></label><button type="button" disabled={betoltes} onClick={() => void frissitSzallitast(rendeles.publicId, "SHIPPED")}>Feladás rögzítése</button></>}{rendeles.shipment?.state === "SHIPPED" && <><p>{rendeles.shipment.carrier}: {rendeles.shipment.trackingNumber}</p><button type="button" disabled={betoltes} onClick={() => void frissitSzallitast(rendeles.publicId, "DELIVERED")}>Kézbesítés rögzítése</button></>}</> : null}<h3>Állapotelőzmény</h3><ol>{rendeles.events.map((event, index) => <li key={`${event.toStatus}-${index}`}>{new Date(event.createdAt).toLocaleString("hu-HU")} · {event.fromStatus ? `${allapotNev[event.fromStatus] ?? event.fromStatus} → ` : ""}{allapotNev[event.toStatus] ?? event.toStatus}{event.note ? ` · ${event.note}` : ""}</li>)}</ol></article>)}</div>;
}
