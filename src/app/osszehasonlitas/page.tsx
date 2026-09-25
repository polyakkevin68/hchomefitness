import Link from "next/link";
import { getProductBySlug } from "@/catalog/katalogus";
import { keszletUzenet } from "@/catalog/keszlet-allapot";
import { betoltOsszehasonlitas } from "@/catalog/termek-osszehasonlitas";
import { huf } from "@/lib/penzformazas";
import OsszehasonlitoTabla, { type OsszehasonlitoSor } from "./osszehasonlito-tabla";
import "./osszehasonlitas.css";

export const dynamic = "force-dynamic";

type OldalTulajdonsagok = { searchParams: Promise<{ termek?: string | string[] }> };

function normalizalErteket(ertek: string | null): string {
  return ertek?.trim().toLocaleLowerCase("hu-HU") ?? "";
}

export default async function OsszehasonlitasOldal({ searchParams }: OldalTulajdonsagok) {
  const parameterek = await searchParams;
  const slugok = typeof parameterek.termek === "string"
    ? [parameterek.termek]
    : parameterek.termek ?? [];
  const eredmeny = await betoltOsszehasonlitas(slugok, getProductBySlug);

  if (eredmeny.hiba) {
    return <main className="osszehasonlitas-oldal"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/">Katalógus</Link></header>
      <section className="osszehasonlitas-hiba" role="alert"><h1>Nem hasonlíthatók össze a kiválasztott termékek</h1><p>{eredmeny.hiba}</p><Link className="osszehasonlitas-vissza" href="/#katalogus">Vissza a katalógushoz</Link></section>
    </main>;
  }

  const termekek = eredmeny.termekek;
  const tulajdonsagok = new Map<string, string>();
  for (const termek of termekek) {
    for (const tulajdonsag of termek.attributes) {
      if (!tulajdonsagok.has(tulajdonsag.id)) tulajdonsagok.set(tulajdonsag.id, tulajdonsag.name);
    }
  }

  const sorok: OsszehasonlitoSor[] = [
    { azonosito: "ar", nev: "Ár", ertekek: termekek.map((termek) => huf.format(termek.priceHuf)), kulonbozik: new Set(termekek.map((termek) => termek.priceHuf)).size > 1 },
    { azonosito: "rendelhetoseg", nev: "Forrás szerinti rendelhetőség", ertekek: termekek.map((termek) => termek.isPurchasable ? "Rendelhető" : "Nem rendelhető"), kulonbozik: new Set(termekek.map((termek) => termek.isPurchasable)).size > 1 },
    { azonosito: "keszlet", nev: "Készletjelzés", ertekek: termekek.map((termek) => keszletUzenet(termek.keszlet)), kulonbozik: new Set(termekek.map((termek) => termek.keszlet?.allapot === "friss" ? `friss-${termek.keszlet.mennyiseg}` : termek.keszlet?.allapot ?? "ismeretlen")).size > 1 },
    ...[...tulajdonsagok.entries()].map(([azonosito, nev]) => {
      const ertekek = termekek.map((termek) => termek.attributes.find((tulajdonsag) => tulajdonsag.id === azonosito)?.value.trim() || null);
      return { azonosito: `jellemzo-${azonosito}`, nev, ertekek, kulonbozik: new Set(ertekek.map(normalizalErteket)).size > 1 };
    }),
  ];

  const kategoriUrl = `/?kategoria=${encodeURIComponent(termekek[0].category)}#katalogus`;

  return <main className="osszehasonlitas-oldal">
    <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href={kategoriUrl}>Vissza a kategóriához</Link></header>
    <div className="osszehasonlitas-tartalom">
      <p className="eyebrow">TUDATOS VÁLASZTÁS</p>
      <h1>Termékek összehasonlítása</h1>
      <p className="osszehasonlitas-bevezeto">Azonos kategóriájú termékek adatai. A hiányzó adatot külön jelöljük, nem következtetünk rá.</p>
      <OsszehasonlitoTabla termekek={termekek.map((termek) => ({ slug: termek.slug, nev: termek.name }))} sorok={sorok} />
      <Link className="osszehasonlitas-vissza" href={kategoriUrl}>Más termékek kiválasztása</Link>
    </div>
  </main>;
}
