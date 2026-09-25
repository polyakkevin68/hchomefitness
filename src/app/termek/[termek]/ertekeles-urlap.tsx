"use client";
import { useState } from "react";
export default function ErtekelesUrlap({ sku }: { sku: string }) {
  const [uzenet, setUzenet] = useState("");
  async function bekuld(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/fiok/ertekeles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sku, csillag: Number(form.get("csillag")), szoveg: form.get("szoveg") }) });
    const result = await response.json().catch(() => ({})); setUzenet(result.uzenet ?? result.hiba ?? "A kérés nem sikerült."); if (response.ok) event.currentTarget.reset();
  }
  return <form onSubmit={bekuld}><label>Értékelés<select name="csillag" defaultValue="5">{[5,4,3,2,1].map((n)=><option key={n} value={n}>{n} / 5</option>)}</select></label><label>Vélemény<textarea name="szoveg" minLength={10} maxLength={3000} required /></label><button type="submit">Értékelés beküldése</button>{uzenet && <p role="status">{uzenet}</p>}</form>;
}
