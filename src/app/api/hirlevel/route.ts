import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { feliratkozikHirlevelre } from "@/ertesites/hirlevel";

export const dynamic = "force-dynamic";
const bemenet = z.object({ email: z.string().max(254), hozzajarult: z.boolean() }).strict();
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }
export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return NextResponse.json({ hiba: "A kérés eredete nem ellenőrizhető." }, { status: 403 });
  const data = bemenet.safeParse(await request.json().catch(() => null));
  if (!data.success) return NextResponse.json({ hiba: "Ellenőrizd az e-mail-címet és a hozzájárulást." }, { status: 400 });
  try {
    const result = await feliratkozikHirlevelre(data.data.email, data.data.hozzajarult);
    if (result.status === "CONSENT_REQUIRED") return NextResponse.json({ hiba: "A feliratkozáshoz külön hozzájárulás szükséges." }, { status: 400 });
    if (result.status === "INVALID_EMAIL") return NextResponse.json({ hiba: "Adj meg érvényes e-mail-címet." }, { status: 400 });
    if (result.status === "PROVIDER_DISABLED") return NextResponse.json({ hiba: "A hírlevélküldés jelenleg nincs beállítva." }, { status: 503 });
    const response = NextResponse.json({ uzenet: "A kérelmedet rögzítettük. A feliratkozás az e-mailes megerősítés után válik aktívvá." }, { status: 202 });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch { return NextResponse.json({ hiba: "A feliratkozási kérelmet most nem sikerült rögzíteni." }, { status: 503 }); }
}
