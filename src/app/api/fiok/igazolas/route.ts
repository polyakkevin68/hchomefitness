import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fiokMunkamenetNap, fiokSutiNeve, igazolFiokEmailt } from "@/fiok/szerveres-fiok";

export const dynamic = "force-dynamic";
const bemenet = z.object({ token: z.string().min(43).max(43) }).strict();

export async function POST(request: NextRequest) {
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  const valasz = (adat: unknown, status: number) => { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; };
  if (!parsed.success) return valasz({ hiba: "Az igazoló hivatkozás nem érvényes." }, 400);
  try {
    const eredmeny = await igazolFiokEmailt(parsed.data.token);
    if (!eredmeny) return valasz({ hiba: "Az igazoló hivatkozás lejárt vagy már felhasználták." }, 400);
    const response = valasz({ fiok: eredmeny.fiok }, 200);
    response.cookies.set(fiokSutiNeve, eredmeny.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: fiokMunkamenetNap * 24 * 60 * 60 });
    return response;
  } catch { return valasz({ hiba: "A fiók igazolása most nem sikerült." }, 500); }
}
