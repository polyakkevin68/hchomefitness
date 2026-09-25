import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { letrehozAdminMunkamenetet, adminSutiNeve } from "@/auth/admin-munkamenet";
import { readAppConfig } from "@/lib/kornyezet-schema";

export const dynamic = "force-dynamic";
const bemenet = z.object({ email: z.string().trim().email().max(254), jelszo: z.string().min(1).max(256) }).strict();

function azonosEredet(request: NextRequest) {
  const eredet = request.headers.get("origin");
  try { return Boolean(eredet && new URL(eredet).origin === new URL(request.url).origin); }
  catch { return false; }
}

export async function POST(request: NextRequest) {
  const responseJson = (adat: unknown, status: number) => {
    const response = NextResponse.json(adat, { status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  if (!azonosEredet(request)) return responseJson({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseJson({ hiba: "Add meg az e-mail-címedet és a jelszavadat." }, 400);
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "ismeretlen";
    const result = await letrehozAdminMunkamenetet(parsed.data.email, parsed.data.jelszo, ip);
    if (!result) return responseJson({ hiba: "A belépési adatok nem érvényesek, vagy átmenetileg próbáld később." }, 401);
    const response = responseJson({ admin: result.admin }, 200);
    response.cookies.set(adminSutiNeve, result.token, {
      httpOnly: true,
      secure: readAppConfig().APP_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: result.expiresAt,
    });
    return response;
  } catch {
    return responseJson({ hiba: "A belépés most nem sikerült." }, 500);
  }
}
