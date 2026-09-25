import type { CatalogProduct } from "./adatmodellek";

function xml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function feedTermekek(termekek: CatalogProduct[]) {
  return termekek.filter((termek) =>
    termek.source === "unas" && !termek.isTestFixture && termek.brand === "HC Home Fitness"
    && termek.sku.length <= 50
    && termek.isPurchasable && Number.isSafeInteger(termek.priceHuf) && termek.priceHuf > 0
    && termek.keszlet?.allapot === "friss" && termek.keszlet.mennyiseg > 0
    && /^https:\/\//.test(termek.imageUrls[0] ?? ""),
  );
}

export function keszitGoogleFeed(termekek: CatalogProduct[], alapUrl: string): string {
  const root = new URL(alapUrl);
  if (root.protocol !== "https:") throw new Error("A termékfeed alap URL-jének HTTPS-t kell használnia.");
  const elemek = feedTermekek(termekek).map((termek) => `<item>
<g:id>${xml(termek.sku.slice(0, 50))}</g:id>
<g:title>${xml(termek.name.slice(0, 150))}</g:title>
<g:description>${xml((termek.description || termek.name).slice(0, 5000))}</g:description>
<g:link>${xml(new URL(`/termek/${encodeURIComponent(termek.slug)}`, root).toString())}</g:link>
<g:image_link>${xml(termek.imageUrls[0])}</g:image_link>
<g:condition>new</g:condition>
<g:availability>in stock</g:availability>
<g:price>${termek.priceHuf.toFixed(2)} HUF</g:price>
<g:brand>HC Home Fitness</g:brand>
</item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>HC Home Fitness</title><link>${xml(root.origin)}</link><description>HC Home Fitness rendelhető termékei</description>${elemek}</channel></rss>`;
}

export function keszitArukeresoFeed(termekek: CatalogProduct[], alapUrl: string): string {
  const root = new URL(alapUrl);
  if (root.protocol !== "https:") throw new Error("A termékfeed alap URL-jének HTTPS-t kell használnia.");
  const elemek = feedTermekek(termekek).filter((termek) => typeof termek.netPriceHuf === "number" && Number.isFinite(termek.netPriceHuf) && termek.netPriceHuf >= 0).map((termek) => `<product>
<identifier>${xml(termek.sku)}</identifier>
<manufacturer>HC Home Fitness</manufacturer>
<name>${xml(termek.name)}</name>
<category>${xml(termek.category)}</category>
<product_url>${xml(new URL(`/termek/${encodeURIComponent(termek.slug)}`, root).toString())}</product_url>
<product_number>${xml(termek.sku)}</product_number>
<price>${termek.priceHuf}</price>
<net_price>${termek.netPriceHuf!.toFixed(2)}</net_price>
<currency>HUF</currency>
<image_url>${xml(termek.imageUrls[0])}</image_url>
</product>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<products>${elemek}</products>`;
}
