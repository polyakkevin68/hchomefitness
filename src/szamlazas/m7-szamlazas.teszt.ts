import { describe, expect, it, vi } from "vitest";
import { keszitSzamlazzXml, letrehozSzamlazzAdapter, SzamlazzHiba, type SzamlazzKeres } from "./szamlazz-agent";
import { ellenorizSzamlaHivatkozast, keszitSzamlaHivatkozast } from "./vedett-dokumentum";

const beallitas = { agentKulcs: "teszt-agent", elektronikusSzamla: false, bankNev: "Teszt Bank", bankszamla: "11111111-22222222", valaszcim: "bolt@example.test" };
const keres: SzamlazzKeres = {
  rendelesAzonosito: "HC-20260925-ABCDEF123456", osszesenHuf: 1200,
  vasarlo: { nev: "Vevő & Társa", email: "vevo@example.test", iranyitoszam: "1111", telepules: "Budapest", cim: "Példa utca 1." },
  keltDatum: "2026-09-25", teljesitesDatum: "2026-09-25", fizetesiHatarido: "2026-09-25", fizetesiMod: "Bankkártya", penznem: "HUF", megjegyzes: "",
  tetelek: [{ megnevezes: "Termék <A>", mennyiseg: 1, egyseg: "db", nettoEgysegar: 1000, afaKulcs: "27", nettoErtek: 1000, afaErtek: 200, bruttoErtek: 1200 }],
};

describe("Számlázz.hu és védett számladokumentum", () => {
  it("XML-kódolja az adatokat, HUF összeget ellenőriz és kikapcsolja az automatikus emailt", () => {
    const xml = keszitSzamlazzXml(beallitas, keres);
    expect(xml).toContain("Vevő &amp; Társa");
    expect(xml).toContain("Termék &lt;A&gt;");
    expect(xml).toContain("<sendEmail>false</sendEmail>");
    expect(xml).toContain("<szamlaagentkulcs>teszt-agent</szamlaagentkulcs>");
  });

  it("eltérő végösszegnél nem készít XML-t", () => {
    expect(() => keszitSzamlazzXml(beallitas, { ...keres, osszesenHuf: 1199 })).toThrow(SzamlazzHiba);
  });

  it("a hivatalos végpont form-data mezőjébe küldi a kérést", async () => {
    const fetch = vi.fn(async () => new Response("<valasz><sikeres>true</sikeres><szamlaszam>TESZT-1</szamlaszam><pdf>JVBERi0xLjQK</pdf></valasz>", { status: 200 }));
    const adapter = letrehozSzamlazzAdapter(beallitas, { fetch });
    await expect(adapter.szamlatKiallit(keres)).resolves.toMatchObject({ invoiceNumber: "TESZT-1", pdf: expect.any(Uint8Array) });
    expect(fetch).toHaveBeenCalledWith("https://www.szamlazz.hu/szamla/", expect.objectContaining({ method: "POST", body: expect.any(FormData) }));
  });

  it("hálózati bizonytalanságot külön jelöl, nem küld újra", async () => {
    const adapter = letrehozSzamlazzAdapter(beallitas, { fetch: vi.fn(async () => { throw new Error("network"); }) });
    await expect(adapter.szamlatKiallit(keres)).rejects.toMatchObject({ eredmeny: "BIZONYTALAN", kod: "HALOZAT" });
  });

  it("a számla kiállítása utáni hibás szolgáltatói választ bizonytalannak hagyja", async () => {
    const adapter = letrehozSzamlazzAdapter(beallitas, { fetch: vi.fn(async () => new Response("<hibas valasz", { status: 200 })) });
    await expect(adapter.szamlatKiallit(keres)).rejects.toMatchObject({ eredmeny: "BIZONYTALAN", kod: "VALASZ" });
  });

  it("a számla-linket aláírja, lejáratkor és módosításkor elutasítja", () => {
    const most = Date.UTC(2026, 8, 25);
    const url = new URL(keszitSzamlaHivatkozast("invoice-1", { titok: "x".repeat(32), alapUrl: "https://bolt.example.test", production: true }, most));
    const lejar = url.searchParams.get("lejar")!;
    const alairas = url.searchParams.get("alairas")!;
    expect(ellenorizSzamlaHivatkozast("invoice-1", lejar, alairas, "x".repeat(32), most)).toBe(true);
    expect(ellenorizSzamlaHivatkozast("invoice-2", lejar, alairas, "x".repeat(32), most)).toBe(false);
    expect(ellenorizSzamlaHivatkozast("invoice-1", lejar, alairas, "x".repeat(32), most + 8 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});
