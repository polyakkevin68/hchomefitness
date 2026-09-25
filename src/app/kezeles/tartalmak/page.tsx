import Link from "next/link";
import TartalomKezelo from "./tartalom-kezelo";
export const dynamic = "force-dynamic";
export default function TartalmakOldal() { return <main className="rendeles-oldal"><header><Link className="brand" href="/">HC HOME FITNESS</Link><Link href="/kezeles/rendelesek">Kezelés</Link></header><section className="rendeles-kartya"><p className="eyebrow">TARTALOMKEZELÉS</p><h1>Márka-, útmutató-, szerviz- és kampányoldalak</h1><p>Az oldal először vázlatként mentődik. Jogi és kereskedői adatot csak ellenőrzött tartalommal tegyél közzé.</p><TartalomKezelo /></section></main>; }
