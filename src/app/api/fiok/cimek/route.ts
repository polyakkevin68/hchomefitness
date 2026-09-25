import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fiokCimLetrehoz, fiokSutiNeve, hitelesitFiokMunkamenetet } from "@/fiok/szerveres-fiok";

export const dynamic = "force-dynamic";
const bemenet = z.object({ nev: z.string().trim().min(2).max(120), iranyitoszam: z.string().regex(/^\d{4}$/), telepules: z.string().trim().min(2).max(100), cim: z.string().trim().min(3).max(200), alapertelmezett: z.boolean().default(false) }).strict();
function valasz(adat: unknown, status = 200) { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; }
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }
export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const fiok = await hitelesitFiokMunkamenetet(request.cookies.get(fiokSutiNeve)?.value);
  if (!fiok) return valasz({ hiba: "A belépés szükséges." }, 401);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "A cím adatai nem megfelelőek." }, 400);
  try { return valasz({ cim: await fiokCimLetrehoz(fiok.id, parsed.data) }, 201); }
  catch { return valasz({ hiba: "A cím nem menthető. Legfeljebb 20 címet tárolhatsz." }, 400); }
}
