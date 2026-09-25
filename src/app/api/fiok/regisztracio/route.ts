import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { inditFiokIgazolast } from "@/fiok/szerveres-fiok";

export const dynamic = "force-dynamic";
const bemenet = z.object({ nev: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), jelszo: z.string().min(14).max(256) }).strict();
function valasz(adat: unknown, status = 200) { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; }
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }

export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "Ellenőrizd a megadott adatokat. A jelszó legalább 14 karakter legyen." }, 400);
  try {
    await inditFiokIgazolast(parsed.data.email, parsed.data.nev, parsed.data.jelszo);
    return valasz({ uzenet: "Ha a fiók aktiválható, e-mailben elküldtük az igazolás lépéseit." }, 202);
  } catch {
    return valasz({ hiba: "Az igazoló levél most nem küldhető el. Próbáld meg később." }, 503);
  }
}
