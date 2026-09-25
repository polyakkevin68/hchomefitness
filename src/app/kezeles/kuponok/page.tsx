import Link from "next/link";
import KuponKezelo from "./kupon-kezelo";
import "./kuponok.css";

export const dynamic = "force-dynamic";
export default function KuponOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/kezeles/rendelesek">Rendelések</Link></header><section className="rendeles-kartya"><p className="eyebrow">TARTALOMKEZELÉS</p><h1>Kuponok</h1><p>Az új kupon alapból kikapcsolt; közzététel előtt ellenőrizd a szabályait.</p><KuponKezelo /></section></main>;
}
