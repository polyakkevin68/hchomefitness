import Link from "next/link";
import { getCatalogPage, getPublishedContentLinks } from "@/catalog/katalogus";
import { kategoriaSlug } from "@/catalog/kategoria";
import { keszletUzenet } from "@/catalog/keszlet-allapot";
import { huf } from "@/lib/penzformazas";
import { readAppConfig } from "@/lib/kornyezet-beallitas";
import HirlevelUrlap from "./hirlevel-urlap";
import "./hirlevel.css";

export const dynamic = "force-dynamic";

type HomePageProps = { searchParams: Promise<{ keres?: string; kategoria?: string; rendezes?: string; oldal?: string }> };

function katalogusOldalLink(filters: { keres?: string; kategoria?: string; rendezes?: string }, oldal: number): string {
  const query = new URLSearchParams();
  if (filters.keres) query.set("keres", filters.keres);
  if (filters.kategoria) query.set("kategoria", filters.kategoria);
  if (filters.rendezes) query.set("rendezes", filters.rendezes);
  query.set("oldal", String(oldal));
  return `/?${query.toString()}#katalogus`;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const isUnasPreview = readAppConfig().CATALOG_ADAPTER === "unas-preview";
  const filters = await searchParams;
  const catalog = await getCatalogPage(filters);
  const tartalmiLinkek = await getPublishedContentLinks();
  const products = catalog.termekek;
  const categories = catalog.kategoriak;

  return (
    <main>
      <div className="announcement">Otthoni edzés, a saját ritmusodban</div>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="HC Home Fitness főoldal"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link>
        <nav aria-label="Fő navigáció"><a href="#katalogus">Katalógus</a><a href="#rolunk">Rólunk</a><Link href="/akciok">Akciók</Link><a href="#kapcsolat">Kapcsolat</a><Link href="/fiok">Fiók</Link></nav>
        <Link className="cart-button" href="/kosar">Kosár <span>›</span></Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">MOZOGJ A SAJÁT TERVED SZERINT</p>
          <h1>Az otthoni edzés<br /><em>új lendületet kap.</em></h1>
          <p className="hero-text">Találd meg a hozzád illő fitneszeszközt. Kényelmesen, átláthatóan, a saját tempódban.</p>
          <a className="primary-button" href="#katalogus">Felfedezem a kínálatot <span aria-hidden="true">↗</span></a>
          <div className="hero-notes"><span>01 <b>Átgondolt választék</b></span><span>02 <b>Otthonra tervezve</b></span></div>
        </div>
        <div className="hero-art" aria-label="Absztrakt, meleg tónusú fitneszillusztráció" role="img">
          <div className="sun"></div><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="art-label">MOVE<br />WELL</div><div className="art-foot">HC / HOME FITNESS</div>
        </div>
      </section>

      <section className="category-band" aria-label="Kategóriák">
        <span className="band-label">FELFEDEZÉS</span>{categories.map((category) => <Link key={category} href={`/kategoria/${kategoriaSlug(category)}`}>{category}<span>↗</span></Link>)}
      </section>

      <section className="catalog-section" id="katalogus">
        <div className="section-heading"><div><p className="eyebrow">VÁLOGATOTT KÍNÁLAT</p><h2>Kezdd el a saját utadon.</h2></div><span>{catalog.szurtTermekekSzama.toString().padStart(2, "0")} termék</span></div>
        {catalog.osszesTermekSzama === 0 ? <div className="empty-state"><span className="empty-symbol">○</span><h3>A katalógus jelenleg nem elérhető</h3><p>A termékforrás beállítása után itt jelennek meg az ellenőrzött HC Home Fitness termékek.</p></div> : <>
          {isUnasPreview ? <div className="demo-notice"><strong>Fejlesztői előnézet</strong> — a közzétett, rendelhető termékek helyben kosárba tehetők; rendelést leadni nem lehet.</div> : process.env.NODE_ENV !== "production" && <div className="demo-notice"><strong>Fejlesztői minta</strong> — ezek tesztadatok, nem valódi termékek.</div>}
          <form className="catalog-filters" method="get" action="/">
            <label>Keresés<input type="search" name="keres" placeholder="Termék vagy kategória" defaultValue={filters.keres ?? ""} /></label>
            <label>Kategória<select name="kategoria" defaultValue={filters.kategoria ?? ""}><option value="">Minden kategória</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Rendezés<select name="rendezes" defaultValue={filters.rendezes ?? ""}><option value="">Ajánlott sorrend</option><option value="ar-novekvo">Ár szerint növekvő</option><option value="ar-csokkeno">Ár szerint csökkenő</option><option value="nev">Név szerint</option></select></label>
            <button type="submit">Mutasd</button>
            {(filters.keres || filters.kategoria || filters.rendezes) && <Link href="/#katalogus" className="filter-reset">Törlés</Link>}
          </form>
          {catalog.szurtTermekekSzama === 0 ? <div className="empty-state"><span className="empty-symbol">⌕</span><h3>Nincs ilyen termék</h3><p>Módosítsd a keresést vagy töröld a szűrőket.</p></div> : <>
          <form className="osszehasonlitas-valasztas" action="/osszehasonlitas" method="get">
          <p className="osszehasonlitas-segitseg">Jelölj ki 2–4, azonos kategóriájú terméket az összehasonlításhoz.</p>
          <div className="product-grid">{products.map((product, index) => <article className="product-card" key={product.sku}>
            <Link href={`/termek/${product.slug}`} className={`product-visual visual-${index % 4}`} aria-label={`${product.name} részletei`}><span className="visual-index">HC / {String(index + 1).padStart(2, "0")}</span>{product.imageUrls[0] ? <span className="actual-product-image" role="img" aria-label={product.name} style={{ backgroundImage: `url("${product.imageUrls[0]}")` }} /> : <span className="product-shape" aria-hidden="true"><i></i><b></b></span>}<span className="visual-link">↗</span></Link>
            <div className="product-meta"><span>{product.category}</span><span>HC HOME FITNESS</span></div><h3><Link href={`/termek/${product.slug}`}>{product.name}</Link></h3><div className="product-bottom"><span>{huf.format(product.priceHuf)}</span><span className="stock-hint">{product.source === "unas" ? keszletUzenet(product.keszlet) : product.isPurchasable ? "Készlet nincs ellenőrizve" : "Jelenleg nem rendelhető"}</span></div>
            <label className={`osszehasonlitas-jelolo${product.source !== "unas" || product.isTestFixture ? " letiltott" : ""}`}><input type="checkbox" name="termek" value={product.slug} disabled={product.source !== "unas" || product.isTestFixture} /><span>Összehasonlításhoz jelölöm</span></label>
          </article>)}</div>
          <button className="osszehasonlitas-indit" type="submit">Kijelölt termékek összehasonlítása</button>
          </form>
          {catalog.oldalakSzama > 1 && <nav className="catalog-pagination" aria-label="Katalógus lapozása">
            {catalog.oldal > 1 && <Link rel="prev" href={katalogusOldalLink(filters, catalog.oldal - 1)}>Előző oldal</Link>}
            <span aria-current="page">{catalog.oldal}. oldal / {catalog.oldalakSzama}</span>
            {catalog.oldal < catalog.oldalakSzama && <Link rel="next" href={katalogusOldalLink(filters, catalog.oldal + 1)}>Következő oldal</Link>}
          </nav>}
          </>}
        </>}
      </section>

      <section className="manifesto" id="rolunk"><div className="manifesto-number">01 — 03</div><div><p className="eyebrow">A MOZGÁS RÓLAD SZÓL</p><h2>Nem kell messzire<br />menned, hogy <em>elindulj.</em></h2></div><p>Az otthonod lehet a kedvenc edzőtermed. Válassz olyan eszközt, amely illeszkedik a céljaidhoz és a mindennapjaidhoz.</p></section>
      <section className="hirlevel-szakasz"><p className="eyebrow">HC HOME FITNESS</p><h2>Kapj hírt az újdonságokról.</h2>{readAppConfig().NEWSLETTER_ENABLED ? <HirlevelUrlap privacyUrl={readAppConfig().NEWSLETTER_PRIVACY_URL!} /> : <p>A hírlevél-feliratkozás az adatkezelési tájékoztató véglegesítéséig nem érhető el.</p>}</section>
      <footer id="kapcsolat"><Link className="brand footer-brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><span>© 2026 HC Home Fitness</span><nav aria-label="Tájékoztató oldalak">{tartalmiLinkek.map((oldal)=><Link key={oldal.slug} href={`/oldal/${oldal.slug}`}>{oldal.cim}</Link>)}</nav><span>Kapcsolat és jogi tájékoztatók hamarosan</span></footer>
    </main>
  );
}
