import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { prisma } from "@/lib/adatbazis-kapcsolat";
export const dynamic = "force-dynamic";
const tartalom = z.object({ id: z.string().min(1).max(80).optional(), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), cim: z.string().trim().min(3).max(160), bevezeto: z.string().trim().min(1).max(1500), szekciok: z.array(z.object({ cim: z.string().trim().min(1).max(160), szoveg: z.string().trim().min(1).max(5000) }).strict()).max(30), kintVan: z.boolean() }).strict();
const out = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const originOk = (r: NextRequest) => { try { return new URL(r.headers.get("origin") ?? "").origin === new URL(r.url).origin; } catch { return false; } };
async function jogosult(request: NextRequest) { return hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "edit_content"); }
export async function GET(request: NextRequest) {
  if (!await jogosult(request)) return out({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  try { return out({ oldalak: await prisma.tartalmiOldal.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }) }); }
  catch { return out({ hiba: "A tartalmak nem érhetők el." }, 503); }
}
export async function POST(request: NextRequest) {
  if (!originOk(request)) return out({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await jogosult(request); if (!admin) return out({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  const parsed = tartalom.safeParse(await request.json().catch(() => null)); if (!parsed.success || parsed.data.id) return out({ hiba: "A tartalmi oldal mezői hibásak." }, 400);
  try { const page = await prisma.$transaction(async (tx) => { const result = await tx.tartalmiOldal.create({ data: parsed.data }); await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "content_page_created", targetType: "TartalmiOldal", targetId: result.id, details: { slug: result.slug, published: result.kintVan } } }); return result; }); return out({ oldal: page }, 201); }
  catch { return out({ hiba: "A tartalmi oldal mentése nem sikerült." }, 409); }
}
export async function PATCH(request: NextRequest) {
  if (!originOk(request)) return out({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await jogosult(request); if (!admin) return out({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  const parsed = tartalom.safeParse(await request.json().catch(() => null)); if (!parsed.success || !parsed.data.id) return out({ hiba: "A tartalmi oldal mezői hibásak." }, 400);
  const { id, ...data } = parsed.data;
  try { const page = await prisma.$transaction(async (tx) => { const result = await tx.tartalmiOldal.update({ where: { id }, data }); await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: data.kintVan ? "content_page_published" : "content_page_updated", targetType: "TartalmiOldal", targetId: id, details: { slug: result.slug, published: result.kintVan } } }); return result; }); return out({ oldal: page }); }
  catch { return out({ hiba: "A tartalmi oldal nem található vagy nem menthető." }, 404); }
}
