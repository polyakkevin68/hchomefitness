import "server-only";
import { z } from "zod";

export type SzamlazzBeallitas = {
  agentKulcs: string;
  elektronikusSzamla: boolean;
  bankNev: string;
  bankszamla: string;
  valaszcim: string;
};
export type SzamlazzTetel = { megnevezes: string; mennyiseg: number; egyseg: string; nettoEgysegar: number; afaKulcs: string; nettoErtek: number; afaErtek: number; bruttoErtek: number };
export type SzamlazzKeres = {
  rendelesAzonosito: string;
  osszesenHuf: number;
  vasarlo: { nev: string; email: string; iranyitoszam: string; telepules: string; cim: string };
  keltDatum: string; teljesitesDatum: string; fizetesiHatarido: string; fizetesiMod: string; penznem: "HUF"; megjegyzes: string; tetelek: SzamlazzTetel[];
};

export class SzamlazzHiba extends Error {
  constructor(readonly eredmeny: "BIZTOS_HIBA" | "BIZONYTALAN", readonly kod: "BEALLITAS" | "HALOZAT" | "SZOLGALTATO" | "VALASZ") {
    super("A számlázási művelet eredménye nem tekinthető biztosnak.");
    this.name = "SzamlazzHiba";
  }
}

const xmlSzoveg = z.string().max(500);
function xmlEsc(ertek: string) { return ertek.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function elem(nev: string, ertek: string | number | boolean) { return "<" + nev + ">" + xmlEsc(String(ertek)) + "</" + nev + ">"; }

function tetelHelyes(tetel: SzamlazzTetel) {
  return Number.isSafeInteger(tetel.mennyiseg) && tetel.mennyiseg > 0
    && Number.isSafeInteger(tetel.nettoEgysegar) && tetel.nettoEgysegar >= 0
    && Number.isSafeInteger(tetel.nettoErtek) && tetel.nettoErtek === tetel.nettoEgysegar * tetel.mennyiseg
    && Number.isSafeInteger(tetel.afaErtek) && tetel.afaErtek >= 0
    && Number.isSafeInteger(tetel.bruttoErtek) && tetel.bruttoErtek === tetel.nettoErtek + tetel.afaErtek
    && xmlSzoveg.safeParse(tetel.megnevezes).success && /^[A-Za-z0-9%_.-]{1,20}$/.test(tetel.afaKulcs)
    && xmlSzoveg.safeParse(tetel.egyseg).success;
}

export function keszitSzamlazzXml(beallitas: SzamlazzBeallitas, keres: SzamlazzKeres) {
  const tetelOsszeg = keres.tetelek.reduce((osszeg, tetel) => osszeg + tetel.bruttoErtek, 0);
  if (!beallitas.agentKulcs.trim() || !beallitas.bankNev.trim() || !beallitas.bankszamla.trim() || !z.string().email().safeParse(beallitas.valaszcim).success
    || keres.penznem !== "HUF" || !/^HC-\d{8}-[A-F0-9]{12}$/.test(keres.rendelesAzonosito)
    || !Number.isSafeInteger(keres.osszesenHuf) || keres.osszesenHuf <= 0 || tetelOsszeg !== keres.osszesenHuf
    || !z.string().email().safeParse(keres.vasarlo.email).success || !keres.vasarlo.nev.trim() || !keres.tetelek.length || keres.tetelek.length > 100 || !keres.tetelek.every(tetelHelyes)) {
    throw new SzamlazzHiba("BIZTOS_HIBA", "BEALLITAS");
  }
  const fejlec = [
    elem("keltDatum", keres.keltDatum), elem("teljesitesDatum", keres.teljesitesDatum), elem("fizetesiHataridoDatum", keres.fizetesiHatarido),
    elem("fizmod", keres.fizetesiMod), elem("penznem", keres.penznem), elem("szamlaNyelve", "hu"), elem("megjegyzes", keres.megjegyzes),
    elem("arfolyamBank", ""), elem("arfolyam", "0"), elem("rendelesSzam", keres.rendelesAzonosito), elem("dijbekeroSzamlaszam", ""),
    elem("elolegszamla", false), elem("vegszamla", false), elem("helyesbitoszamla", false), elem("helyesbitettSzamlaszam", ""),
    elem("dijbekero", false), elem("szamlaszamElotag", ""), elem("simpleItems", false),
  ].join("");
  const vevo = [
    elem("nev", keres.vasarlo.nev), elem("orszag", "Magyarország"), elem("irsz", keres.vasarlo.iranyitoszam), elem("telepules", keres.vasarlo.telepules),
    elem("cim", keres.vasarlo.cim), elem("email", keres.vasarlo.email), elem("sendEmail", false), elem("adoszam", ""),
    elem("postazasiNev", ""), elem("postazasiOrszag", ""), elem("postazasiIrsz", ""), elem("postazasiTelepules", ""),
    elem("postazasiCim", ""), elem("telefonszam", ""), elem("megjegyzes", ""),
  ].join("");
  const tetelek = keres.tetelek.map((tetel) => "<tetel>"
    + elem("megnevezes", tetel.megnevezes) + elem("mennyiseg", tetel.mennyiseg) + elem("mennyisegiEgyseg", tetel.egyseg)
    + elem("nettoEgysegar", tetel.nettoEgysegar) + elem("afakulcs", tetel.afaKulcs) + elem("nettoErtek", tetel.nettoErtek)
    + elem("afaErtek", tetel.afaErtek) + elem("bruttoErtek", tetel.bruttoErtek) + elem("megjegyzes", "") + elem("torloKod", "") + "</tetel>").join("");
  return '<?xml version="1.0" encoding="UTF-8"?>'
    + '<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">'
    + "<beallitasok>" + elem("szamlaagentkulcs", beallitas.agentKulcs) + elem("eszamla", beallitas.elektronikusSzamla)
    + elem("szamlaLetoltes", true) + elem("valaszVerzio", 2) + elem("aggregator", "") + elem("szamlaKulsoAzon", keres.rendelesAzonosito) + "</beallitasok>"
    + "<fejlec>" + fejlec + "</fejlec><elado>" + elem("bank", beallitas.bankNev) + elem("bankszamlaszam", beallitas.bankszamla)
    + elem("emailReplyto", beallitas.valaszcim) + elem("emailTargy", "") + elem("emailSzoveg", "") + "</elado>"
    + "<vevo>" + vevo + "</vevo><fuvarlevel>" + elem("uticel", "") + elem("futarSzolgalat", "") + "</fuvarlevel><tetelek>" + tetelek + "</tetelek></xmlszamla>";
}

function tagErteke(torzs: string, nev: string) {
  const talalat = new RegExp("<(?:[A-Za-z0-9_-]+:)?" + nev + "\\b[^>]*>([\\s\\S]*?)</(?:[A-Za-z0-9_-]+:)?" + nev + "\\s*>", "i").exec(torzs);
  return talalat?.[1]?.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim() ?? null;
}

export function letrehozSzamlazzAdapter(beallitas: SzamlazzBeallitas, eszkoz: { fetch?: typeof fetch; idozitoMs?: number } = {}) {
  if (!beallitas.agentKulcs.trim()) throw new SzamlazzHiba("BIZTOS_HIBA", "BEALLITAS");
  return {
    async szamlatKiallit(keres: SzamlazzKeres) {
      const xmlBody = keszitSzamlazzXml(beallitas, keres);
      const form = new FormData();
      form.set("action-xmlagentxmlfile", new Blob([xmlBody], { type: "application/xml; charset=utf-8" }), "szamla.xml");
      let response: Response;
      try {
        response = await (eszkoz.fetch ?? fetch)("https://www.szamlazz.hu/szamla/", {
          method: "POST", body: form, headers: { Accept: "application/xml" },
          signal: AbortSignal.timeout(eszkoz.idozitoMs ?? 15_000), cache: "no-store", redirect: "error",
        });
      } catch { throw new SzamlazzHiba("BIZONYTALAN", "HALOZAT"); }
      if (response.status >= 500) throw new SzamlazzHiba("BIZONYTALAN", "SZOLGALTATO");
      if (!response.ok) throw new SzamlazzHiba("BIZTOS_HIBA", "SZOLGALTATO");
      let bytes: Uint8Array;
      try { bytes = new Uint8Array(await response.arrayBuffer()); }
      catch { throw new SzamlazzHiba("BIZONYTALAN", "VALASZ"); }
      if (bytes.byteLength === 0 || bytes.byteLength > 15 * 1024 * 1024) throw new SzamlazzHiba("BIZONYTALAN", "VALASZ");
      const responseText = new TextDecoder().decode(bytes);
      const sikeres = tagErteke(responseText, "sikeres");
      let fejlEcSzamlaszam = "";
      try { fejlEcSzamlaszam = decodeURIComponent(response.headers.get("szlahu_szamlaszam") ?? ""); } catch { throw new SzamlazzHiba("BIZTOS_HIBA", "VALASZ"); }
      const invoiceNumber = tagErteke(responseText, "szamlaszam") ?? fejlEcSzamlaszam;
      const encodedPdf = tagErteke(responseText, "pdf");
      const pdf = encodedPdf ? Buffer.from(encodedPdf, "base64") : null;
      if (sikeres !== "true" || !invoiceNumber || !pdf || pdf.byteLength < 8 || pdf.byteLength > 10 * 1024 * 1024 || pdf.toString("ascii", 0, 5) !== "%PDF-") {
        throw new SzamlazzHiba("BIZONYTALAN", "VALASZ");
      }
      return { invoiceNumber, pdf: new Uint8Array(pdf), externalId: tagErteke(responseText, "szamlaKulsoAzon") };
    },
  };
}
