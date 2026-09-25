import Link from "next/link";
import { VisszateresVezerlo } from "@/app/fizetes/visszateres-vezerlo";
import "@/app/rendeles.css";

export default async function FizetesiVisszateres({ searchParams }: { searchParams: Promise<{ rendeles?: string }> }) {
  const { rendeles } = await searchParams;
  const azonosito = rendeles && /^HC-\d{8}-[A-F0-9]{12}$/.test(rendeles) ? rendeles : null;
  return <main className="rendeles-oldal"><header><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/">Vissza a főoldalra</Link></header><section className="rendeles-kartya"><p className="eyebrow">ONLINE FIZETÉS</p><h1>Fizetési visszajelzés</h1>{azonosito ? <VisszateresVezerlo azonosito={azonosito} /> : <p className="rendeles-allapot">A rendelési azonosító érvénytelen.</p>}</section></main>;
}
