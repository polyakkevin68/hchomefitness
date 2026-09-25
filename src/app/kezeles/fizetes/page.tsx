import Link from "next/link";
import FizetesKezelo from "./fizetes-kezelo";
import "@/app/rendeles.css";

export default function FizetesKezeloOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><nav><Link href="/kezeles/rendelesek">Rendelések</Link><Link href="/">Webáruház</Link></nav></header><section className="rendeles-kartya"><p className="eyebrow">PÉNZÜGYI KEZELÉS</p><h1>Fizetések és visszatérítések</h1><FizetesKezelo /></section></main>;
}
