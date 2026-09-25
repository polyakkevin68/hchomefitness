import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogPage } from "@/catalog/katalogus";
import { kategoriaSlug } from "@/catalog/kategoria";
import { huf } from "@/lib/penzformazas";
import { readAppConfig } from "@/lib/kornyezet-beallitas";
import "../../katalogus.css";
import "../kategoria.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ keres?: string; rendezes?: string; oldal?: string }> };

function oldalLink(slug: string, filters: { keres?: string; rendezes?: string }, oldal: number) {
  const query = new URLSearchParams();
  if (filters.keres) query.set("keres", filters.keres);
  if (filters.rendezes) query.set("rendezes", filters.rendezes);
  query.set("oldal", String(oldal));
  return `/kategoria/${slug}?${query.toString()}`;
}

export default async function KategoriaOldal({ params, searchParams }: Props) {
  const [{ slug }, filters, osszes] = await Promise.all([params, searchParams, getCatalogPage({ oldalmeret: 1 })]);
  const nev = osszes.kategoriak.find((kategoria) => kategoriaSlug(kategoria) === slug);
  if (!nev) notFound();
  const catalog = await getCatalogPage({ ...filters, kategoria: nev });
  const elonezet = readAppConfig().CATALOG_ADAPTER === "unas-preview";

  return <main className="kategoria-oldal"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><nav aria-label="Fő navigáció"><Link href="/#katalogus">Katalógus</Link><Link href="/kosar">Kosár</Link></nav></header><section className="catalog-section">
    <nav className="kategoria-morzsa" aria-label="Morzsamenü"><Link href="/">Főoldal</Link><span aria-hidden="true">/</span><span>{nev}</span></nav>
    <div className="section-heading"><div><p className="eyebrow">HC HOME FITNESS</p><h1>{nev}</h1></div><span>{catalog.szurtTermekekSzama} termék</span></div>
    <p className="kategoria-bevezeto">A(z) {nev.toLocaleLowerCase("hu-HU")} kategória ellenőrzött HC Home Fitness termékei.</p>
    {elonezet && <p className="demo-notice"><strong>Fejlesztői előnézet</strong> — a közzétett, rendelhető termékek helyben kosárba tehetők; rendelést leadni nem lehet.</p>}
    <form className="catalog-filters" method="get">
      <label>Keresés<input type="search" name="keres" placeholder="Termék keresése" defaultValue={filters.keres ?? ""} /></label>
      <label>Rendezés<select name="rendezes" defaultValue={filters.rendezes ?? ""}><option value="">Ajánlott sorrend</option><option value="ar-novekvo">Ár szerint növekvő</option><option value="ar-csokkeno">Ár szerint csökkenő</option><option value="nev">Név szerint</option></select></label>
      <button type="submit">Mutasd</button>
      {(filters.keres || filters.rendezes) && <Link href={`/kategoria/${slug}`} className="filter-reset">Törlés</Link>}
    </form>
    {catalog.termekek.length ? <div className="product-grid">{catalog.termekek.map((product) => <article className="product-card" key={product.sku}>
      <Link href={`/termek/${product.slug}`} className="product-visual"><span className="visual-index">HC / {product.sku}</span>{product.imageUrls[0] ? <span className="actual-product-image" role="img" aria-label={product.name} style={{ backgroundImage: `url("${product.imageUrls[0]}")` }} /> : <span className="product-shape" aria-hidden="true"><i></i><b></b></span>}</Link>
      <div className="product-meta"><span>{nev}</span><span>HC HOME FITNESS</span></div><h2><Link href={`/termek/${product.slug}`}>{product.name}</Link></h2><div className="product-bottom"><span>{huf.format(product.priceHuf)}</span><Link href={`/termek/${product.slug}`}>Részletek</Link></div>
    </article>)}</div> : <div className="empty-state"><h2>Nincs ilyen termék</h2><p>Módosítsd a keresést, vagy nézd meg a teljes katalógust.</p><Link href="/">Vissza a katalógushoz</Link></div>}
    {catalog.oldalakSzama > 1 && <nav className="catalog-pagination" aria-label="Kategória lapozása">{catalog.oldal > 1 && <Link rel="prev" href={oldalLink(slug, filters, catalog.oldal - 1)}>Előző oldal</Link>}<span aria-current="page">{catalog.oldal}. oldal / {catalog.oldalakSzama}</span>{catalog.oldal < catalog.oldalakSzama && <Link rel="next" href={oldalLink(slug, filters, catalog.oldal + 1)}>Következő oldal</Link>}</nav>}
    <p className="kategoria-vissza"><Link href="/#katalogus">← Teljes katalógus</Link></p>
  </section></main>;
}
