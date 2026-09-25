import { NextResponse, type NextRequest } from "next/server";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { listazKezelendoRendeleseket } from "@/rendeles/szerveres-rendeles";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const responseJson = (data: unknown, status: number) => {
    const response = NextResponse.json(data, { status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  if (!await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_orders")) return responseJson({ hiba: "Nincs jogosultságod a rendelési adatok megtekintéséhez." }, 401);
  try { return responseJson({ rendelesek: await listazKezelendoRendeleseket() }, 200); }
  catch { return responseJson({ hiba: "A rendelési lista nem tölthető be." }, 500); }
}
