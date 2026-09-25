"use client";

import { useEffect, useState } from "react";

export function VisszateresVezerlo({ azonosito }: { azonosito: string }) {
  const [allapot, setAllapot] = useState("Fizetés ellenőrzése…");
  useEffect(() => {
    let aktiv = true;
    fetch(`/api/rendeles/${encodeURIComponent(azonosito)}/fizetes`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!aktiv) return;
        if (data.allapot === "PAID") setAllapot("A fizetés sikeres. A rendelésedet rögzítettük.");
        else if (data.allapot === "FAILED" || data.allapot === "EXPIRED") setAllapot("A fizetés nem fejeződött be. A rendelési oldalon újra ellenőrizheted.");
        else if (data.allapot === "UNKNOWN" || !response.ok) setAllapot("A fizetés eredményét még ellenőrizzük. Kérjük, ne indíts új fizetést.");
        else setAllapot("A fizetés még folyamatban van. A rendelési oldalon később újra ellenőrizheted.");
      })
      .catch(() => { if (aktiv) setAllapot("A fizetés eredményét még ellenőrizzük. Kérjük, ne indíts új fizetést."); });
    return () => { aktiv = false; };
  }, [azonosito]);
  return <><p className="rendeles-allapot" role="status">{allapot}</p><a href={`/rendeles/${encodeURIComponent(azonosito)}`}>Vissza a rendeléshez</a></>;
}
