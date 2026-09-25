"use client";

import { useState } from "react";

export default function KosarbaTeszi({ termekId, engedelyezett }: { termekId: string; engedelyezett: boolean }) {
  const [uzenet, setUzenet] = useState("");
  const [folyamatban, setFolyamatban] = useState(false);
  async function kosarbaTeszi() {
    setFolyamatban(true);
    try {
      const current = await fetch("/api/kosar", { cache: "no-store" });
      const kosar = await current.json();
      if (!current.ok) throw new Error(kosar.hiba ?? "A kosár nem tölthető be.");
      const response = await fetch("/api/kosar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ termekId, verzio: kosar.verzio }) });
      const adat = await response.json();
      if (!response.ok) throw new Error(adat.hiba ?? "A termék nem tehető a kosárba.");
      setUzenet("A termék a kosárba került.");
    } catch (error) { setUzenet(error instanceof Error ? error.message : "A termék nem tehető a kosárba."); }
    finally { setFolyamatban(false); }
  }
  return <div className="kosarba-vezeto"><button className="primary-button" type="button" disabled={!engedelyezett || folyamatban} onClick={() => void kosarbaTeszi()}>{folyamatban ? "Feldolgozás…" : engedelyezett ? "Kosárba teszem" : "Vásárlás még nem elérhető"}</button>{uzenet && <p role="status">{uzenet} <a href="/kosar">Kosár megnyitása</a></p>}</div>;
}
