import Link from "next/link";
import RendelesKezelo from "./rendeles-kezelo";
import "@/app/rendeles.css";

export const dynamic = "force-dynamic";

export default function RendelesKezeloOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/">Főoldal</Link></header><section className="rendeles-kartya"><p className="eyebrow">KEZELŐI FELÜLET</p><h1>Rendelések készletellenőrzése</h1><p>Az itt végzett megerősítés a készlet kézi ellenőrzését jelenti. Készletfoglalás és fizetés innen nem indul.</p><RendelesKezelo /></section></main>;
}
