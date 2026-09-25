import Link from "next/link";
import ErtesitesKezelo from "./ertesites-kezelo";
import "@/app/rendeles.css";

export const dynamic = "force-dynamic";

export default function ErtesitesKezeloOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><nav><Link href="/kezeles/rendelesek">Rendelések</Link><Link href="/kezeles/szamlak">Számlák</Link><Link href="/">Főoldal</Link></nav></header><section className="rendeles-kartya"><p className="eyebrow">KEZELŐI FELÜLET</p><h1>Tranzakciós értesítések</h1><p>A bizonytalan küldéseket a rendszer nem ismétli meg automatikusan.</p><ErtesitesKezelo /></section></main>;
}
