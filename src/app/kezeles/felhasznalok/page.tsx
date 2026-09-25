import Link from "next/link";
import FelhasznaloKezelo from "./felhasznalo-kezelo";
import "@/app/rendeles.css";

export const dynamic = "force-dynamic";

export default function FelhasznalokOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/kezeles/rendelesek">Rendelések</Link></header><section className="rendeles-kartya"><p className="eyebrow">KEZELŐI FELÜLET</p><h1>Kezelői fiókok</h1><p>Új hozzáférést csak tulajdonos hozhat létre. A letiltott fiók munkamenetei azonnal megszűnnek.</p><FelhasznaloKezelo /></section></main>;
}
