import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { prisma } from "@/lib/adatbazis-kapcsolat";

export const dynamic = "force-dynamic";
const bemenet = z.object({
  kod: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/),
  tipus: z.enum(["SZAZALEK", "OSSZEG"]), ertek: z.number().int().min(1).max(99_999_999),
  minimumHuf: z.number().int().min(0).max(99_999_999), maximumHuf: z.number().int().min(1).max(99_999_999).nullable(),
  indulAt: z.string().datetime(), lejarAt: z.string().datetime(), felhasznalasiKeret: z.number().int().min(1).max(1_000_000).nullable(),
  osszevonhato: z.boolean(), kategoriak: z.array(z.string().trim().min(1).max(100)).max(30), cikkszamok: z.array(z.string().trim().min(1).max(80)).max(100),
}).strict().superRefine((adat, ctx) => {
  if (adat.tipus === "SZAZALEK" && adat.ertek > 100) ctx.addIssue({ code: "custom", path: ["ertek"], message: "A százalék legfeljebb 100 lehet." });
  if (Date.parse(adat.indulAt) >= Date.parse(adat.lejarAt)) ctx.addIssue({ code: "custom", path: ["lejarAt"], message: "A lejáratnak az indulás után kell lennie." });
});
const aktivSchema = z.object({ kuponId: z.string().min(1).max(80), aktiv: z.boolean() }).strict();
function valasz(adat: unknown, status = 200) { const response = NextResponse.json(adat, { status }); response.headers.set("Cache-Control", "private, no-store"); return response; }
function azonosEredet(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }

export async function GET(request: NextRequest) {
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "edit_content");
  if (!admin) return valasz({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  try {
    const kuponok = await prisma.kupon.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { felhasznalasok: true } } } });
    return valasz({ kuponok: kuponok.map(({ _count, ...kupon }) => ({ ...kupon, felhasznalasokSzama: _count.felhasznalasok })) });
  } catch { return valasz({ hiba: "A kuponlista nem érhető el." }, 500); }
}

export async function POST(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "edit_content");
  if (!admin) return valasz({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "Ellenőrizd a kupon értékét, idejét és termékkörét." }, 400);
  if (parsed.data.tipus === "SZAZALEK" && parsed.data.ertek > 100) return valasz({ hiba: "A százalék legfeljebb 100 lehet." }, 400);
  try {
    const kupon = await prisma.$transaction(async (tx) => {
      const uj = await tx.kupon.create({ data: { ...parsed.data, indulAt: new Date(parsed.data.indulAt), lejarAt: new Date(parsed.data.lejarAt), aktiv: false } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "coupon_created", targetType: "Kupon", targetId: uj.id, details: { code: uj.kod, discountType: uj.tipus, amount: uj.ertek } } });
      return uj;
    });
    return valasz({ kupon }, 201);
  } catch (hiba) {
    if (hiba instanceof Prisma.PrismaClientKnownRequestError && hiba.code === "P2002") return valasz({ hiba: "Ez a kuponkód már létezik." }, 409);
    return valasz({ hiba: "A kupon mentése nem sikerült." }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "edit_content");
  if (!admin) return valasz({ hiba: "Tartalomkezelői belépés szükséges." }, 401);
  const parsed = aktivSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "A kupon állapota hibás." }, 400);
  try {
    const kupon = await prisma.$transaction(async (tx) => {
      const frissitett = await tx.kupon.update({ where: { id: parsed.data.kuponId }, data: { aktiv: parsed.data.aktiv } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: parsed.data.aktiv ? "coupon_activated" : "coupon_deactivated", targetType: "Kupon", targetId: frissitett.id, details: { code: frissitett.kod } } });
      return frissitett;
    });
    return valasz({ kupon });
  } catch { return valasz({ hiba: "A kupon állapota nem menthető." }, 404); }
}
