import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { KOSAR_SUTI } from "@/kosar/szerveres-kosar";
import { RendelesHiba, rogzitRendelesiIgenyt } from "@/rendeles/szerveres-rendeles";

export const dynamic = "force-dynamic";
const cim = z.object({ orszag: z.literal("HU"), iranyitoszam: z.string().regex(/^\d{4}$/), telepules: z.string().trim().min(2).max(100), cim: z.string().trim().min(3).max(200) }).strict();
const bemenet = z.object({
  ajanlatToken: z.string().min(32).max(256),
  idempotenciaKulcs: z.string().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/),
  vevo: z.object({ nev: z.string().trim().min(2).max(120), email: z.string().email().max(254), telefon: z.string().trim().min(7).max(24).regex(/^\+?[0-9 ()-]+$/) }).strict(),
  szallitasiCim: cim,
  szamlazasiCim: cim.optional(),
}).strict();

function valasz(adat: unknown, status = 200) {
  const response = NextResponse.json(adat, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function azonosEredet(request: NextRequest) {
  const eredet = request.headers.get("origin");
  if (!eredet) return false;
  try { return new URL(eredet).origin === new URL(request.url).origin; } catch { return false; }
}

export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403);
  const session = request.cookies.get(KOSAR_SUTI)?.value;
  if (!session) return valasz({ hiba: "A kosár munkamenete hiányzik." }, 404);
  let nyersAdat: unknown;
  try { nyersAdat = await request.json(); }
  catch { return valasz({ hiba: "A rendelési adatok hibásak." }, 400); }
  try {
    const config = readAppConfig();
    if (!config.ORDER_REQUESTS_ENABLED) return valasz({ hiba: "A rendelési igények jelenleg ki vannak kapcsolva.", kod: "RENDELES_KIKAPCSOLVA" }, 503);
    const parsed = bemenet.safeParse(nyersAdat);
    if (!parsed.success) return valasz({ hiba: "A rendelési adatok hibásak." }, 400);
    const result = await rogzitRendelesiIgenyt(session, parsed.data);
    const response = valasz({ rendeles: result.rendeles }, 201);
    response.cookies.set(`hc_rendeles_${result.rendeles.publicId}`, result.vendegToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
      path: "/", maxAge: 90 * 24 * 60 * 60,
    });
    return response;
  } catch (hiba) {
    if (hiba instanceof RendelesHiba) {
      const status = hiba.kod === "HIBAS_IGENY" ? 400 : hiba.kod === "NEM_TALALHATO" ? 404 : 409;
      return valasz({ hiba: hiba.message, kod: hiba.kod }, status);
    }
    return valasz({ hiba: "A rendelési igény mentése nem sikerült." }, 500);
  }
}
