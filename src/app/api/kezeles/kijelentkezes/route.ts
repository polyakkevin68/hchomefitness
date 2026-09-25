import { NextResponse, type NextRequest } from "next/server";
import { adminSutiNeve, visszavonAdminMunkamenetet } from "@/auth/admin-munkamenet";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const responseJson = (adat: unknown, status: number) => {
    const response = NextResponse.json(adat, { status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const eredet = request.headers.get("origin");
  try {
    if (!eredet || new URL(eredet).origin !== new URL(request.url).origin) return responseJson({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403);
  } catch { return responseJson({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403); }
  try { await visszavonAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value); }
  catch { return responseJson({ hiba: "A kijelentkezés nem sikerült." }, 500); }
  const response = responseJson({ sikeres: true }, 200);
  response.cookies.set(adminSutiNeve, "", { httpOnly: true, secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:", sameSite: "strict", path: "/", expires: new Date(0) });
  return response;
}
