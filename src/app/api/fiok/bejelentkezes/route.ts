import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { beleptetFiokot, fiokSutiNeve } from "@/fiok/szerveres-fiok";

export const dynamic = "force-dynamic";
const bemenet = z.object({ email: z.string().trim().email().max(254), jelszo: z.string().min(1).max(256) }).strict();
function valasz(adat: unknown, status = 200) { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; }
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }

export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "Az e-mail-cím vagy a jelszó nem megfelelő." }, 400);
  try {
    const forras = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "ismeretlen";
    const eredmeny = await beleptetFiokot(parsed.data.email, parsed.data.jelszo, forras);
    if (!eredmeny) return valasz({ hiba: "A belépési adatok nem érvényesek, vagy az e-mail-cím még nincs igazolva." }, 401);
    const response = valasz({ fiok: eredmeny.fiok });
    response.cookies.set(fiokSutiNeve, eredmeny.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: eredmeny.expiresAt });
    return response;
  } catch { return valasz({ hiba: "A belépés most nem sikerült." }, 500); }
}
