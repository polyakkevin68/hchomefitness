import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { KosarHiba } from "@/penztar/osszegzes";
import { betoltVagyLetrehozKosarat, hozzaadKosarhoz, KOSAR_SUTI, KosarVerzioHiba, lekerKosarOsszegzes, modositKosarTetelt, modositSzallitasiModot, torolKosarTetelt } from "@/kosar/szerveres-kosar";

export const dynamic = "force-dynamic";
const mutationSchema = z.object({ termekId: z.string().min(1).max(80), mennyiseg: z.number().int().min(1).max(10), verzio: z.number().int().nonnegative() }).strict();
const addSchema = z.object({ termekId: z.string().min(1).max(80), verzio: z.number().int().nonnegative() }).strict();
const removeSchema = z.object({ termekId: z.string().min(1).max(80), verzio: z.number().int().nonnegative() }).strict();
const shippingSchema = z.object({ szallitasiMod: z.enum(["hazhoz", "emeletre"]), verzio: z.number().int().nonnegative() }).strict();

function privateJson(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

function replyError(error: unknown) {
  if (error instanceof KosarVerzioHiba) return privateJson({ hiba: error.message, kod: "VERZIO_UTKOZES" }, 409);
  if (error instanceof KosarHiba) return privateJson({ hiba: error.message, kod: error.kod }, error.kod === "NEM_VASAROLHATO" ? 409 : 400);
  return privateJson({ hiba: "A kosár művelet nem sikerült." }, 500);
}

function setSessionCookie(response: NextResponse, session: string) {
  response.cookies.set(KOSAR_SUTI, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function GET(request: NextRequest) {
  try {
    const cart = await betoltVagyLetrehozKosarat(request.cookies.get(KOSAR_SUTI)?.value);
    const response = privateJson(await lekerKosarOsszegzes(cart.session));
    setSessionCookie(response, cart.session);
    return response;
  } catch (error) { return replyError(error); }
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  try {
    const parsed = mutationSchema.safeParse(await request.json());
    if (!parsed.success) return privateJson({ hiba: "A kosártétel adatai hibásak." }, 400);
    const cart = await betoltVagyLetrehozKosarat(request.cookies.get(KOSAR_SUTI)?.value);
    const value = await modositKosarTetelt(cart.session, parsed.data, parsed.data.verzio);
    const response = privateJson(value);
    setSessionCookie(response, cart.session);
    return response;
  } catch (error) { return replyError(error); }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  try {
    const parsed = addSchema.safeParse(await request.json());
    if (!parsed.success) return privateJson({ hiba: "A kosártétel adatai hibásak." }, 400);
    const cart = await betoltVagyLetrehozKosarat(request.cookies.get(KOSAR_SUTI)?.value);
    const result = await hozzaadKosarhoz(cart.session, parsed.data.termekId, parsed.data.verzio);
    const response = privateJson(result);
    setSessionCookie(response, cart.session);
    return response;
  } catch (error) { return replyError(error); }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  try {
    const parsed = removeSchema.safeParse(await request.json());
    if (!parsed.success) return privateJson({ hiba: "A kosártétel adatai hibásak." }, 400);
    const session = request.cookies.get(KOSAR_SUTI)?.value;
    if (!session) return privateJson({ hiba: "A kosár nem található." }, 404);
    const value = await torolKosarTetelt(session, parsed.data.termekId, parsed.data.verzio);
    return privateJson(value);
  } catch (error) { return replyError(error); }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  try {
    const parsed = shippingSchema.safeParse(await request.json());
    if (!parsed.success) return privateJson({ hiba: "A szállítási adatok hibásak." }, 400);
    const session = request.cookies.get(KOSAR_SUTI)?.value;
    if (!session) return privateJson({ hiba: "A kosár nem található." }, 404);
    return privateJson(await modositSzallitasiModot(session, parsed.data.szallitasiMod, parsed.data.verzio));
  } catch (error) { return replyError(error); }
}
