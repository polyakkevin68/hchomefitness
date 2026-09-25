"use client";
import Link from "next/link";
import { useState } from "react";

export default function HirlevelMuvelet({ token, tipus }: { token: string; tipus: "igazolas" | "leiratkozas" }) {
  const [uzenet, setUzenet] = useState("");
  const [betoltes, setBetoltes] = useState(false);
  async function vegrehajt() {
    setBetoltes(true);
    const response = await fetch(`/api/hirlevel/${tipus}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const result = await response.json().catch(() => ({}));
    setUzenet(result.uzenet ?? result.hiba ?? "A kérés nem sikerült."); setBetoltes(false);
  }
  return <main className="fiok-oldal"><section className="fiok-tartalom"><p className="eyebrow">HC HOME FITNESS · HÍRLEVÉL</p><h1>{tipus === "igazolas" ? "Feliratkozás megerősítése" : "Leiratkozás"}</h1><p>{tipus === "igazolas" ? "A feliratkozás aktiválásához erősítsd meg az e-mail-címedet." : "A leiratkozás véglegesítéséhez használd az alábbi gombot."}</p><button className="fiok-gomb" disabled={!token || betoltes || Boolean(uzenet)} onClick={vegrehajt}>{betoltes ? "Feldolgozás…" : tipus === "igazolas" ? "Feliratkozás megerősítése" : "Leiratkozom"}</button>{uzenet && <p role="status">{uzenet}</p>}<Link href="/">Vissza a főoldalra</Link></section></main>;
}
