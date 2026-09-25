import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { leiratkozikHirlevelrol } from "@/ertesites/hirlevel";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const parsed = z.object({ token: z.string().min(43).max(43) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hiba: "A leiratkozási hivatkozás nem érvényes." }, { status: 400 });
  try { return await leiratkozikHirlevelrol(parsed.data.token) ? NextResponse.json({ uzenet: "Leiratkoztál a hírlevélről." }) : NextResponse.json({ hiba: "A hivatkozás nem érvényes vagy már felhasználták." }, { status: 400 }); }
  catch { return NextResponse.json({ hiba: "A leiratkozás most nem sikerült." }, { status: 503 }); }
}
