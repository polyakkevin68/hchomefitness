import Link from "next/link";
import RendelesKezelo from "./rendeles-kezelo";
import "@/app/rendeles.css";

export const dynamic = "force-dynamic";

export default function RendelesKezeloOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><nav aria-label="Kezelői menü">
    <Link href="/kezeles/fizetes">Pénzügyek</Link><Link href="/kezeles/ertesitesek">Értesítések</Link><Link href="/kezeles/szamlak">Számlák</Link>
    <Link href="/kezeles/kuponok">Kuponok</Link><Link href="/kezeles/ajanlok">Termékajánlók</Link><Link href="/kezeles/ertekelesek">Értékelések</Link>
    <Link href="/kezeles/termekek">Termékek jóváhagyása</Link>
    <Link href="/kezeles/tartalmak">Tartalmak</Link><Link href="/kezeles/felhasznalok">Kezelői fiókok</Link><Link href="/">Főoldal</Link>
  </nav></header><section className="rendeles-kartya"><p className="eyebrow">KEZELŐI FELÜLET</p><h1>Rendelések készletellenőrzése</h1><p>Az itt végzett megerősítés a készlet kézi ellenőrzését jelenti. Készletfoglalás és fizetés innen nem indul.</p><RendelesKezelo /></section></main>;
}
