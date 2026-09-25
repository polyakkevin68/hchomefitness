import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { kapcsolKorabbiRendelestFiokhoz, fiokSutiNeve, hitelesitFiokMunkamenetet } from "@/fiok/szerveres-fiok";

export const dynamic = "force-dynamic";
const bemenet = z.object({ publicId: z.string().regex(/^HC-[0-9]{8}-[A-F0-9]{12}$/) }).strict();
function valasz(adat: unknown, status = 200) { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; }
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }
export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const fiok = await hitelesitFiokMunkamenetet(request.cookies.get(fiokSutiNeve)?.value);
  if (!fiok) return valasz({ hiba: "Az igazolt fiókba való belépés szükséges." }, 401);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "A rendelésazonosító nem megfelelő." }, 400);
  const vendegToken = request.cookies.get(`hc_rendeles_${parsed.data.publicId}`)?.value;
  if (!vendegToken) return valasz({ hiba: "A rendelés nem kapcsolható ehhez a fiókhoz." }, 404);
  try {
    const sikeres = await kapcsolKorabbiRendelestFiokhoz(fiok.id, fiok.email, parsed.data.publicId, vendegToken);
    return sikeres ? valasz({ sikeres: true }) : valasz({ hiba: "A rendelés nem kapcsolható ehhez a fiókhoz." }, 404);
  } catch { return valasz({ hiba: "A rendelés összekapcsolása nem sikerült." }, 500); }
}
