"use client";

import { useState } from "react";

export function FizetesiVezerlo({ azonosito }: { azonosito: string }) {
  const [uzenet, setUzenet] = useState("");
  const [betoltes, setBetoltes] = useState(false);
  async function fizetesInditasa() {
    setBetoltes(true);
    setUzenet("");
    try {
      const response = await fetch(`/api/rendeles/${encodeURIComponent(azonosito)}/fizetes`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", cache: "no-store" });
      const data = await response.json();
      if (response.ok && typeof data.paymentUrl === "string") window.location.assign(data.paymentUrl);
      else setUzenet(data.hiba ?? "A fizetést most nem sikerült elindítani.");
    } catch {
      setUzenet("A fizetés állapota nem ellenőrizhető. Frissítsd ezt az oldalt később.");
    } finally {
      setBetoltes(false);
    }
  }
  return <div className="fizetesi-vezerlo"><button type="button" onClick={() => void fizetesInditasa()} disabled={betoltes}>{betoltes ? "Ellenőrzés…" : "Fizetés bankkártyával"}</button>{uzenet && <p role="status">{uzenet}</p>}</div>;
}
