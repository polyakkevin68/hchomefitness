import Link from "next/link";
import ErtekelesKezelo from "./ertekeles-kezelo";
export const dynamic="force-dynamic";
export default function ErtekelesekOldal(){return <main className="rendeles-oldal"><header><Link className="brand" href="/">HC HOME FITNESS</Link><Link href="/kezeles/rendelesek">Kezelés</Link></header><section className="rendeles-kartya"><p className="eyebrow">TARTALOMKEZELÉS</p><h1>Vásárlói értékelések</h1><p>Csak igazolt, megerősített rendeléshez kötött vélemények jelennek meg jóváhagyás után.</p><ErtekelesKezelo /></section></main>;}
