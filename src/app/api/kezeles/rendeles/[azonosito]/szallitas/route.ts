import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { frissitHelyiSzallitmanyt, TeljesitesiHiba } from "@/rendeles/szerveres-teljesites";

export const dynamic = "force-dynamic";
const bemenet = z.object({
  allapot: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  futar: z.string().trim().max(100).optional().default(""),
  kovetesiSzam: z.string().trim().max(100).optional().default(""),
  kovetesiUrl: z.string().trim().url().max(2048).optional(),
  idempotenciaKulcs: z.string().regex(/^[A-Za-z0-9_-]{12,80}$/),
}).strict().superRefine((adat, ctx) => {
  if (adat.allapot === "SHIPPED" && adat.futar.length < 2) ctx.addIssue({ code: "custom", path: ["futar"], message: "A futárszolgálat kötelező." });
  if (adat.allapot === "SHIPPED" && adat.kovetesiSzam.length < 3) ctx.addIssue({ code: "custom", path: ["kovetesiSzam"], message: "A követési szám kötelező." });
});

export async function POST(request: NextRequest, context: { params: Promise<{ azonosito: string }> }) {
  const responseJson = (adat: unknown, status: number) => {
    const response = NextResponse.json(adat, { status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const eredet = request.headers.get("origin");
  try {
    if (!eredet || new URL(eredet).origin !== new URL(request.url).origin) return responseJson({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403);
  } catch { return responseJson({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403); }
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_orders");
  if (!admin) return responseJson({ hiba: "Nincs jogosultságod a szállítás kezeléséhez." }, 401);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseJson({ hiba: "A szállítási adatok hibásak." }, 400);
  const { azonosito } = await context.params;
  if (!/^HC-\d{8}-[A-F0-9]{12}$/.test(azonosito)) return responseJson({ hiba: "A rendelés nem található." }, 404);
  try {
    const shipment = await frissitHelyiSzallitmanyt(azonosito, parsed.data, admin.id);
    return responseJson({ szallitas: shipment }, 200);
  } catch (hiba) {
    if (hiba instanceof TeljesitesiHiba) {
      const status = hiba.kod === "RENDELES_NEM_TALALHATO" ? 404 : hiba.kod === "KESZLET_NINCS_IGAZOLVA" ? 409 : 400;
      return responseJson({ hiba: hiba.message, kod: hiba.kod }, status);
    }
    return responseJson({ hiba: "A szállítási állapot mentése nem sikerült." }, 500);
  }
}
