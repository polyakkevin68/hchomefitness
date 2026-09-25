import { getCatalogPage } from "@/catalog/katalogus";
import { logEvent } from "@/lib/naplozas";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const keres = query.get("keres") ?? undefined;
  const kategoria = query.get("kategoria") ?? undefined;
  const rendezes = query.get("rendezes") ?? undefined;
  const oldal = query.get("oldal") ?? undefined;
  if ((keres?.length ?? 0) > 120 || (kategoria?.length ?? 0) > 100 || (oldal?.length ?? 0) > 10) {
    return Response.json({ error: "Érvénytelen katalóguslekérdezés." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await getCatalogPage({ keres, kategoria, rendezes, oldal });
    const response = {
      ...result,
      termekek: result.termekek.map(({ sku, slug, name, category, priceHuf, imageUrls, isPurchasable, source, keszlet }) => ({
        sku,
        slug,
        name,
        category,
        priceHuf,
        imageUrl: imageUrls[0] ?? null,
        isPurchasable,
        source,
        keszlet,
    })),
    };
    return Response.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    logEvent("error", "catalog.api.failed");
    return Response.json({ error: "A katalógus átmenetileg nem érhető el." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
