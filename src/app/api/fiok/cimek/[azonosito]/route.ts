import { NextResponse, type NextRequest } from "next/server";
import { fiokCimTorol, fiokSutiNeve, hitelesitFiokMunkamenetet } from "@/fiok/szerveres-fiok";

export const dynamic = "force-dynamic";
function valasz(adat: unknown, status = 200) { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; }
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ azonosito: string }> }) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const fiok = await hitelesitFiokMunkamenetet(request.cookies.get(fiokSutiNeve)?.value);
  if (!fiok) return valasz({ hiba: "A belépés szükséges." }, 401);
  const { azonosito } = await params;
  try { return await fiokCimTorol(fiok.id, azonosito) ? valasz({ sikeres: true }) : valasz({ hiba: "A cím nem található." }, 404); }
  catch { return valasz({ hiba: "A cím törlése nem sikerült." }, 500); }
}
