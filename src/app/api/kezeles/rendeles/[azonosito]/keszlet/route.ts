import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { RendelesHiba, megerositRendelesiKeszletet } from "@/rendeles/szerveres-rendeles";

export const dynamic = "force-dynamic";
const bemenet = z.object({ muvelet: z.enum(["megerosit", "elutasit"]), megjegyzes: z.string().trim().min(10).max(500) }).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ azonosito: string }> }) {
  const responseJson = (data: unknown, status: number) => {
    const response = NextResponse.json(data, { status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) return responseJson({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403);
  } catch { return responseJson({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403); }
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "confirm_stock");
  if (!admin) return responseJson({ hiba: "Nincs jogosultságod a készletdöntéshez." }, 401);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseJson({ hiba: "A készletellenőrzés adatai hibásak." }, 400);
  const { azonosito } = await context.params;
  if (!/^HC-\d{8}-[A-F0-9]{12}$/.test(azonosito)) return responseJson({ hiba: "A rendelés nem található." }, 404);
  try {
    const result = await megerositRendelesiKeszletet(azonosito, parsed.data.muvelet, parsed.data.megjegyzes, "ORDER_OPERATIONS", admin.id);
    return responseJson({ rendeles: result }, 200);
  } catch (hiba) {
    if (hiba instanceof RendelesHiba) return responseJson({ hiba: hiba.message, kod: hiba.kod }, hiba.kod === "NEM_TALALHATO" ? 404 : 409);
    return responseJson({ hiba: "A készletdöntés mentése nem sikerült." }, 500);
  }
}
