import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { KOSAR_SUTI, KosarVerzioHiba } from "@/kosar/szerveres-kosar";
import { KosarHiba } from "@/penztar/osszegzes";
import { KuponHiba, keszitAjanlatot } from "@/penztar/szerveres-ajanlat";

export const dynamic = "force-dynamic";
const bemenet = z.object({ verzio: z.number().int().nonnegative(), kuponKod: z.string().trim().max(40).optional() }).strict();

function privateJson(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

function hibaValasz(error: unknown) {
  if (error instanceof KosarVerzioHiba) return privateJson({ hiba: error.message, kod: "VERZIO_UTKOZES" }, 409);
  if (error instanceof KuponHiba) return privateJson({ hiba: error.message, kod: "KUPON_NEM_ERVENYES" }, 400);
  if (error instanceof KosarHiba) return privateJson({ hiba: error.message, kod: error.kod }, error.kod === "FORRAS_ADAT_ELAVULT" ? 503 : error.kod === "NEM_VASAROLHATO" ? 409 : 400);
  return privateJson({ hiba: "Az ajánlat nem készíthető el." }, 500);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const session = request.cookies.get(KOSAR_SUTI)?.value;
  if (!session) return privateJson({ hiba: "A kosár nem található." }, 404);
  try {
    const parsed = bemenet.safeParse(await request.json());
    if (!parsed.success) return privateJson({ hiba: "Az ajánlatkérés adatai hibásak." }, 400);
    return privateJson(await keszitAjanlatot(session, parsed.data.verzio, parsed.data.kuponKod));
  } catch (error) { return hibaValasz(error); }
}
