import { NextResponse, type NextRequest } from "next/server";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_orders");
  const response = NextResponse.json(admin ? { admin } : { admin: null }, { status: admin ? 200 : 401 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
