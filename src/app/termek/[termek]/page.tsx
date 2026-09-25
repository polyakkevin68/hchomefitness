import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProductRecommendations, getPublishedReviews } from "@/catalog/katalogus";
import { kategoriaSlug } from "@/catalog/kategoria";
import { keszletUzenet } from "@/catalog/keszlet-allapot";
import { huf } from "@/lib/penzformazas";
import { readAppConfig } from "@/lib/kornyezet-beallitas";
import KosarbaTeszi from "@/app/kosarba-tesz";
import ErtekelesUrlap from "./ertekeles-urlap";
import "./termek-ajanlok.css";
import "./termek-reszletes.css";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ termek: string }> }) {
  const { termek } = await params;
  const isUnasPreview = readAppConfig().CATALOG_ADAPTER === "unas-preview";
  const product = await getProductBySlug(termek);
  if (!product) notFound();
  const ajanlok = await getProductRecommendations(termek);
  const ertekelesek = await getPublishedReviews(termek);
  const fejlesztoiMod = process.env.NODE_ENV !== "production";
  const demoMode = fejlesztoiMod || isUnasPreview;
  const helyiKosarproba = fejlesztoiMod && isUnasPreview;
  const frissPozitivKeszlet = product.keszlet?.allapot === "friss" && product.keszlet.mennyiseg > 0;
  const vasarolhato = product.source === "unas" && Boolean(product.id) && product.isPurchasable
    && frissPozitivKeszlet && (!fejlesztoiMod || (helyiKosarproba && product.isPublished === true));

  return <main className="product-page"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/kosar">Kosár</Link></header><div className="product-detail"><div className={`product-detail-art${product.imageUrls[0] ? " has-image" : ""}`} style={product.imageUrls[0] ? { backgroundImage: `url("${product.imageUrls[0]}")` } : undefined} role={product.imageUrls[0] ? "img" : undefined} aria-label={product.imageUrls[0] ? product.name : undefined}><span>HC / HOME FITNESS</span>{!product.imageUrls[0] && <div className="product-shape"><i></i><b></b></div>}</div><div className="product-detail-copy"><p className="eyebrow"><Link href={`/kategoria/${kategoriaSlug(product.category)}`}>{product.category}</Link></p><h1>{product.name}</h1><p className="detail-brand">HC HOME FITNESS · {product.sku}</p><p className="detail-price">{huf.format(product.priceHuf)}</p>{demoMode && <p className="demo-notice"><strong>{isUnasPreview ? "Fejlesztői előnézet" : "Fejlesztői minta"}</strong> — {isUnasPreview ? "A közzétett, rendelhető termékek helyben kosárba tehetők; rendelést leadni nem lehet." : "Ezek tesztadatok, nem valódi termékek."}</p>}<p>{product.description}</p>{product.longDescription && <section className="product-long-description"><h2>Részletes leírás</h2><p>{product.longDescription}</p></section>}<p className="stock-hint">{product.source === "unas" ? keszletUzenet(product.keszlet) : "A készlet nincs ellenőrizve."}</p><div className="unavailable">{!product.isPurchasable ? "A forrásrendszer szerint ez a termék jelenleg nem rendelhető." : !frissPozitivKeszlet ? "A kosárhoz friss, pozitív készletadat szükséges." : helyiKosarproba && vasarolhato ? "A kosárpróba helyben működik, rendelésleadás nincs bekapcsolva." : demoMode && !vasarolhato ? "A helyi előnézetben csak közzétett termék tehető kosárba." : "Házhoz szállítás: 0 Ft. Emeletre szállítás: 19 900 Ft."}</div><KosarbaTeszi termekId={product.id ?? product.sourceId} engedelyezett={vasarolhato} />{product.attributes.length > 0 && <section className="product-specs"><h2>Műszaki adatok</h2><dl>{product.attributes.map((attribute) => <div key={attribute.id}><dt>{attribute.name}</dt><dd>{attribute.value}</dd></div>)}</dl></section>}</div></div>{ajanlok.length > 0 && <section className="product-related"><p className="eyebrow">HOZZÁILLŐ KIEGÉSZÍTŐK</p><h2>Ezeket is nézd meg</h2><ul>{ajanlok.map((ajanlo) => <li key={ajanlo.slug}><Link href={`/termek/${ajanlo.slug}`}>{ajanlo.name}</Link><span>{huf.format(ajanlo.priceHuf)}</span></li>)}</ul></section>}<section className="product-related"><p className="eyebrow">VALÓDI VÁSÁRLÓI VÉLEMÉNYEK</p><h2>Értékelések</h2>{ertekelesek.length ? <ul>{ertekelesek.map((item, index) => <li key={`${item.createdAt.toISOString()}-${index}`}><span aria-label={`${item.csillag} csillag`}>{"★".repeat(item.csillag)}{"☆".repeat(5-item.csillag)}</span><p>{item.szoveg}</p><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleDateString("hu-HU")}</time></li>)}</ul> : <p>Még nincs közzétett, ellenőrzött vásárlói értékelés.</p>}<p>Értékelést csak belépett vásárló küldhet igazolt, megerősített rendelés után; a vélemény moderálás után jelenik meg.</p><ErtekelesUrlap sku={product.sku} /></section></main>;
}
