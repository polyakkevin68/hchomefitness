import { NextResponse, type NextRequest } from "next/server";
import { lekerVendegRendelest } from "@/rendeles/szerveres-rendeles";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ azonosito: string }> }) {
  const { azonosito } = await context.params;
  const responseJson = (data: unknown, status: number) => {
    const response = NextResponse.json(data, { status });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  if (!/^HC-\d{8}-[A-F0-9]{12}$/.test(azonosito)) return responseJson({ hiba: "A rendelés nem található." }, 404);
  const token = request.cookies.get(`hc_rendeles_${azonosito}`)?.value;
  if (!token) return responseJson({ hiba: "A rendelés nem található." }, 404);
  try { return responseJson(await lekerVendegRendelest(azonosito, token), 200); }
  catch { return responseJson({ hiba: "A rendelés nem található." }, 404); }
}
