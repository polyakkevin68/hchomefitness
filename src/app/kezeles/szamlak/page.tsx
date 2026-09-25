import Link from "next/link";
import SzamlaKezelo from "./szamla-kezelo";
import "@/app/rendeles.css";

export const dynamic = "force-dynamic";

export default function SzamlaKezeloOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><nav><Link href="/kezeles/rendelesek">Rendelések</Link><Link href="/kezeles/ertesitesek">Értesítések</Link><Link href="/">Főoldal</Link></nav></header><section className="rendeles-kartya"><p className="eyebrow">PÉNZÜGYI KEZELÉS</p><h1>Számlák</h1><p>Ide a külső számlázóban elkészült számlaszám és PDF rögzíthető. A rendszer nem állít ki számlát jóváhagyott adózási szabályok nélkül.</p><SzamlaKezelo /></section></main>;
}
