import { NextResponse, type NextRequest } from "next/server";
import { fiokCimek, fiokRendelesek, hitelesitFiokMunkamenetet } from "@/fiok/szerveres-fiok";

export const dynamic = "force-dynamic";
function valasz(adat: unknown, status = 200) { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; }

export async function GET(request: NextRequest) {
  try {
    const fiok = await hitelesitFiokMunkamenetet(request.cookies.get("hc-fiok")?.value);
    if (!fiok) return valasz({ hiba: "A belépés szükséges." }, 401);
    const [rendelesek, cimek] = await Promise.all([fiokRendelesek(fiok.id), fiokCimek(fiok.id)]);
    return valasz({ fiok, rendelesek, cimek });
  } catch { return valasz({ hiba: "A fiók adatainak lekérése nem sikerült." }, 500); }
}
