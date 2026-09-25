import Link from "next/link";
import TermekJovahagyas from "./termek-jovahagyas";
import "@/app/rendeles.css";
import "./termekek.css";

export const dynamic = "force-dynamic";

export default function TermekJovahagyasOldal() {
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/kezeles/rendelesek">Kezelőfelület</Link></header><section className="rendeles-kartya"><p className="eyebrow">TULAJDONOSI JÓVÁHAGYÁS</p><h1>Termékek közzététele</h1><p>Ellenőrizd a termék nevét, árát és készletét. Csak jóváhagyott, valódi HC/UNAS-termék jelenik meg a nyilvános katalógusban. A vásárláshoz külön friss készletadat szükséges.</p><TermekJovahagyas /></section></main>;
}
