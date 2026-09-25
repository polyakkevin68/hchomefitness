import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/catalog/katalogus";
import { keszletUzenet } from "@/catalog/keszlet-allapot";
import { huf } from "@/lib/penzformazas";
import { readAppConfig } from "@/lib/kornyezet-beallitas";
import KosarbaTeszi from "@/app/kosarba-tesz";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ termek: string }> }) {
  const { termek } = await params;
  const isUnasPreview = readAppConfig().CATALOG_ADAPTER === "unas-preview";
  const product = await getProductBySlug(termek);
  if (!product) notFound();
  const demoMode = process.env.NODE_ENV !== "production" || isUnasPreview;
  const vasarolhato = !demoMode && product.source === "unas" && Boolean(product.id) && product.isPurchasable;

  return <main className="product-page"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/kosar">Kosár</Link></header><div className="product-detail"><div className={`product-detail-art${product.imageUrls[0] ? " has-image" : ""}`} style={product.imageUrls[0] ? { backgroundImage: `url("${product.imageUrls[0]}")` } : undefined} role={product.imageUrls[0] ? "img" : undefined} aria-label={product.imageUrls[0] ? product.name : undefined}><span>HC / HOME FITNESS</span>{!product.imageUrls[0] && <div className="product-shape"><i></i><b></b></div>}</div><div className="product-detail-copy"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><p className="detail-brand">HC HOME FITNESS · {product.sku}</p><p className="detail-price">{huf.format(product.priceHuf)}</p>{demoMode && <p className="demo-notice"><strong>{isUnasPreview ? "Fejlesztői előnézet" : "Fejlesztői minta"}</strong> — {isUnasPreview ? "UNAS bruttó ár HUF-ban; a termék nincs közzétéve, vásárolni nem lehet." : "Ezek tesztadatok, nem valódi termékek."}</p>}<p>{product.description}</p><p className="stock-hint">{product.source === "unas" ? keszletUzenet(product.keszlet) : "A készlet nincs ellenőrizve."}</p><div className="unavailable">{!product.isPurchasable ? "A forrásrendszer szerint ez a termék jelenleg nem rendelhető." : demoMode ? "A vásárlás a termékek közzétételéig nem elérhető." : "Házhoz szállítás: 0 Ft. Emeletre szállítás: 19 900 Ft."}</div><KosarbaTeszi termekId={product.id ?? product.sourceId} engedelyezett={vasarolhato} />{product.attributes.length > 0 && <section className="product-specs"><h2>Műszaki adatok</h2><dl>{product.attributes.map((attribute) => <div key={attribute.id}><dt>{attribute.name}</dt><dd>{attribute.value}</dd></div>)}</dl></section>}</div></div></main>;
}
