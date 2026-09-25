import { NextResponse, type NextRequest } from "next/server";
import { fiokSutiNeve, kijelentkeztetFiokot } from "@/fiok/szerveres-fiok";

export const dynamic = "force-dynamic";
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }
export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return NextResponse.json({ hiba: "A kérés eredete nem ellenőrizhető." }, { status: 403 });
  await kijelentkeztetFiokot(request.cookies.get(fiokSutiNeve)?.value);
  const response = NextResponse.json({ sikeres: true });
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(fiokSutiNeve, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
