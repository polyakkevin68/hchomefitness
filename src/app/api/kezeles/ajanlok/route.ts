import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { prisma } from "@/lib/adatbazis-kapcsolat";

export const dynamic = "force-dynamic";
const bemenet = z.object({ forrasSlug: z.string().min(1).max(160), celSlug: z.string().min(1).max(160) }).strict();
const aktivBemenet = z.object({ ajanloId: z.string().min(1).max(80), aktiv: z.boolean() }).strict();
function valasz(adat: unknown, status = 200) { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; }
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }
async function ellenoriz(request: NextRequest) { return hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "edit_content"); }

export async function GET(request: NextRequest) {
  if (!await ellenoriz(request)) return valasz({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  try {
    const ajanlok = await prisma.termekAjanlo.findMany({ orderBy: [{ forrasTermek: { name: "asc" } }, { sorrend: "asc" }], take: 200, include: { forrasTermek: { select: { slug: true, sku: true, name: true } }, celTermek: { select: { slug: true, sku: true, name: true } } } });
    return valasz({ ajanlok });
  } catch { return valasz({ hiba: "Az ajánlólista nem érhető el." }, 500); }
}

export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await ellenoriz(request);
  if (!admin) return valasz({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.forrasSlug === parsed.data.celSlug) return valasz({ hiba: "Adj meg két külön terméket." }, 400);
  try {
    const [forras, cel] = await Promise.all([parsed.data.forrasSlug, parsed.data.celSlug].map((slug) => prisma.product.findFirst({ where: { slug, source: "unas", brand: "HC Home Fitness", isActive: true, isPublished: true, isTestFixture: false }, select: { id: true } })));
    if (!forras || !cel) return valasz({ hiba: "Csak közzétett, valódi HC/UNAS termék választható." }, 400);
    const ajanlo = await prisma.$transaction(async (tx) => {
      const uj = await tx.termekAjanlo.create({ data: { forrasTermekId: forras.id, celTermekId: cel.id }, include: { forrasTermek: { select: { slug: true, sku: true, name: true } }, celTermek: { select: { slug: true, sku: true, name: true } } } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "product_recommendation_created", targetType: "TermekAjanlo", targetId: uj.id, details: { forras: uj.forrasTermek.sku, cel: uj.celTermek.sku } } });
      return uj;
    });
    return valasz({ ajanlo }, 201);
  } catch { return valasz({ hiba: "Az ajánló már szerepel, vagy nem menthető." }, 409); }
}

export async function PATCH(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await ellenoriz(request);
  if (!admin) return valasz({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  const parsed = aktivBemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "Az ajánló állapota hibás." }, 400);
  try {
    const ajanlo = await prisma.$transaction(async (tx) => {
      const frissitett = await tx.termekAjanlo.update({ where: { id: parsed.data.ajanloId }, data: { aktiv: parsed.data.aktiv } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: parsed.data.aktiv ? "product_recommendation_activated" : "product_recommendation_deactivated", targetType: "TermekAjanlo", targetId: frissitett.id, details: {} } });
      return frissitett;
    });
    return valasz({ ajanlo });
  } catch { return valasz({ hiba: "Az ajánló állapota nem menthető." }, 404); }
}
