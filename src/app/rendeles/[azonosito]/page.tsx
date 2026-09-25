import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { lekerVendegRendelest } from "@/rendeles/szerveres-rendeles";
import "@/app/rendeles.css";

export const dynamic = "force-dynamic";
const huf = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 });

export default async function RendelesOldal({ params }: { params: Promise<{ azonosito: string }> }) {
  const { azonosito } = await params;
  const token = (await cookies()).get(`hc_rendeles_${azonosito}`)?.value;
  if (!token) notFound();
  let adat;
  try { adat = await lekerVendegRendelest(azonosito, token); } catch { notFound(); }
  const szallitasiCim = adat.szallitasiCim;
  const tetelek = Array.isArray(adat.tetelek) ? adat.tetelek as Array<{ nev?: string; cikkszam?: string; mennyiseg?: number; egysegarHuf?: number; sorOsszegHuf?: number }> : [];
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/">Vissza a főoldalra</Link></header><section className="rendeles-kartya"><p className="eyebrow">RENDELÉSI IGÉNY · {adat.publicId}</p><h1>Köszönjük a megkeresést</h1><p className="rendeles-allapot">{adat.keszletUzenet} A fizetés jelenleg nincs bekapcsolva.</p><div className="rendeles-adatok"><section><h2>Kapcsolattartó</h2><p>{adat.vevo.nev}<br />{adat.vevo.email}<br />{adat.vevo.telefon}</p></section><section><h2>Szállítási cím</h2><p>{szallitasiCim?.iranyitoszam} {szallitasiCim?.telepules}<br />{szallitasiCim?.cim}<br />Magyarország</p></section><section className="rendeles-tetelek"><h2>Rögzített ajánlat</h2><ul>{tetelek.map((tetel, index) => <li key={`${tetel.cikkszam}-${index}`}><span>{tetel.nev} · {tetel.mennyiseg} db</span><strong>{huf.format(tetel.sorOsszegHuf ?? 0)}</strong></li>)}</ul><p>Termékek: {huf.format(adat.termekOsszegHuf)}<br />Szállítás: {huf.format(adat.szallitasHuf)}<br /><strong>Összesen: {huf.format(adat.totalHuf)}</strong></p></section></div></section></main>;
}
