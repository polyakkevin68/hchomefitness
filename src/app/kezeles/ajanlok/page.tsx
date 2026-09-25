import Link from "next/link";
import AjanloKezelo from "./ajanlo-kezelo";
import "./ajanlok.css";

export const dynamic = "force-dynamic";
export default function AjanloOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/kezeles/rendelesek">Kezelés</Link></header><section className="rendeles-kartya"><p className="eyebrow">TARTALOMKEZELÉS</p><h1>Termékajánlók</h1><p>Csak közzétett, valódi HC termékek kapcsolhatók össze. Az új ajánló először kikapcsolt.</p><AjanloKezelo /></section></main>;
}
