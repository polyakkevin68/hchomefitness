"use client";
import { useState } from "react";

export default function HirlevelUrlap({ privacyUrl }: { privacyUrl: string }) {
  const [uzenet, setUzenet] = useState("");
  const [hiba, setHiba] = useState(false);
  async function kuldes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setUzenet("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/hirlevel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), hozzajarult: data.get("hozzajarult") === "igen" }) });
    const result = await response.json().catch(() => ({}));
    setHiba(!response.ok); setUzenet(result.uzenet ?? result.hiba ?? "A kérés nem sikerült.");
    if (response.ok) event.currentTarget.reset();
  }
  return <form className="hirlevel-urlap" onSubmit={kuldes}><label>E-mail-cím<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label className="hirlevel-hozzajarulas"><input name="hozzajarult" type="checkbox" value="igen" required />Hozzájárulok, hogy a HC Home Fitness hírlevelet küldjön. Elolvastam az <a href={privacyUrl} target="_blank" rel="noreferrer">adatkezelési tájékoztatót</a>. A feliratkozást e-mailben erősítem meg, és bármikor leiratkozhatok.</label><button type="submit">Feliratkozás</button>{uzenet && <p role="status" aria-live="polite" className={hiba ? "hiba" : "siker"}>{uzenet}</p>}</form>;
}
