"use client";

import { useState } from "react";
import Link from "next/link";

export type OsszehasonlitoTermek = { slug: string; nev: string };
export type OsszehasonlitoSor = { azonosito: string; nev: string; ertekek: (string | null)[]; kulonbozik: boolean };

export default function OsszehasonlitoTabla({ termekek, sorok }: { termekek: OsszehasonlitoTermek[]; sorok: OsszehasonlitoSor[] }) {
  const [csakKulonbsegek, setCsakKulonbsegek] = useState(false);
  const lathatoSorok = csakKulonbsegek ? sorok.filter((sor) => sor.kulonbozik) : sorok;

  return <section className="osszehasonlitas-tabla">
    <label className="osszehasonlitas-kapcsolo">
      <input type="checkbox" checked={csakKulonbsegek} onChange={(esemeny) => setCsakKulonbsegek(esemeny.currentTarget.checked)} />
      Csak az eltérő adatokat mutasd
    </label>
    <p className="osszehasonlitas-sorok" aria-live="polite">{lathatoSorok.length} összehasonlítható adat</p>
    <div className="osszehasonlitas-gorgeto" role="region" aria-label="Termékadatok összehasonlítása" tabIndex={0}>
      <table>
        <caption className="csak-kepernyoolvasonak">Kiválasztott HC termékek összehasonlítása</caption>
        <thead><tr><th scope="col">Termékadat</th>{termekek.map((termek) => <th scope="col" key={termek.slug}><Link href={`/termek/${termek.slug}`}>{termek.nev}</Link></th>)}</tr></thead>
        <tbody>{lathatoSorok.map((sor) => <tr key={sor.azonosito} className={sor.kulonbozik ? "osszehasonlitas-eltaro" : undefined}>
          <th scope="row">{sor.nev}</th>
          {sor.ertekek.map((ertek, index) => <td key={`${sor.azonosito}-${termekek[index].slug}`}>{ertek ?? <span className="osszehasonlitas-hianyzo">Nincs megadva</span>}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
