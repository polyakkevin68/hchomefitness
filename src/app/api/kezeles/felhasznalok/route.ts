import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { hashAdminJelszot } from "@/auth/admin-hitelesites";
import { prisma } from "@/lib/adatbazis-kapcsolat";

export const dynamic = "force-dynamic";
const bemenet = z.object({
  email: z.string().trim().email().max(254),
  jelszo: z.string().min(14).max(256),
  szerepkor: z.enum(["OPERATIONS", "FINANCE", "CONTENT", "READ_ONLY"]),
}).strict();

export async function GET(request: NextRequest) {
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_users");
  if (!admin) return NextResponse.json({ hiba: "Nincs jogosultságod a kezelői fiókokhoz." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const felhasznalok = await prisma.adminUser.findMany({
    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ felhasznalok }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const valasz = (adat: unknown, status: number) => NextResponse.json(adat, { status, headers: { "Cache-Control": "private, no-store" } });
  const eredet = request.headers.get("origin");
  try {
    if (!eredet || new URL(eredet).origin !== new URL(request.url).origin) return valasz({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403);
  } catch { return valasz({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403); }
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_users");
  if (!admin) return valasz({ hiba: "Nincs jogosultságod kezelői fiók létrehozásához." }, 401);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "Ellenőrizd az e-mail-címet, a legalább 14 karakteres jelszót és a szerepkört." }, 400);
  try {
    const passwordHash = await hashAdminJelszot(parsed.data.jelszo);
    const uj = await prisma.$transaction(async (tx) => {
      const user = await tx.adminUser.create({ data: { email: parsed.data.email.toLowerCase(), passwordHash, role: parsed.data.szerepkor } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "admin_user_created", targetType: "AdminUser", targetId: user.id, details: { role: user.role, email: user.email } } });
      return { id: user.id, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt };
    });
    return valasz({ felhasznalo: uj }, 201);
  } catch (hiba) {
    if (hiba instanceof Prisma.PrismaClientKnownRequestError && hiba.code === "P2002") return valasz({ hiba: "Ezzel az e-mail-címmel már van kezelői fiók." }, 409);
    return valasz({ hiba: "A kezelői fiók mentése nem sikerült." }, 500);
  }
}

const allapotBemenet = z.object({ felhasznaloId: z.string().min(1).max(64), aktiv: z.boolean() }).strict();

export async function PATCH(request: NextRequest) {
  const valasz = (adat: unknown, status: number) => NextResponse.json(adat, { status, headers: { "Cache-Control": "private, no-store" } });
  const eredet = request.headers.get("origin");
  try {
    if (!eredet || new URL(eredet).origin !== new URL(request.url).origin) return valasz({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403);
  } catch { return valasz({ hiba: "A kérelem eredete nem ellenőrizhető." }, 403); }
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_users");
  if (!admin) return valasz({ hiba: "Nincs jogosultságod a kezelői fiókok módosításához." }, 403);
  const parsed = allapotBemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "A kezelői fiók vagy az új állapot nem érvényes." }, 400);
  if (parsed.data.felhasznaloId === admin.id && !parsed.data.aktiv) return valasz({ hiba: "A saját fiókodat nem tilthatod le." }, 409);
  try {
    const felhasznalo = await prisma.$transaction(async (tx) => {
      const cel = await tx.adminUser.findUnique({ where: { id: parsed.data.felhasznaloId } });
      if (!cel) return null;
      if (cel.isActive === parsed.data.aktiv) return { id: cel.id, email: cel.email, role: cel.role, isActive: cel.isActive, createdAt: cel.createdAt };
      if (cel.role === "OWNER" && !parsed.data.aktiv) {
        const aktivTulajdonosok = await tx.adminUser.count({ where: { role: "OWNER", isActive: true } });
        if (aktivTulajdonosok <= 1) throw new Error("UTOLSO_TULAJDONOS");
      }
      const frissitett = await tx.adminUser.update({ where: { id: cel.id }, data: { isActive: parsed.data.aktiv } });
      if (!parsed.data.aktiv) await tx.adminSession.updateMany({ where: { adminUserId: cel.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.adminAuditLog.create({
        data: { adminUserId: admin.id, action: parsed.data.aktiv ? "admin_user_activated" : "admin_user_deactivated", targetType: "AdminUser", targetId: cel.id, details: { role: cel.role, email: cel.email } },
      });
      return { id: frissitett.id, email: frissitett.email, role: frissitett.role, isActive: frissitett.isActive, createdAt: frissitett.createdAt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return felhasznalo ? valasz({ felhasznalo }, 200) : valasz({ hiba: "A kezelői fiók nem található." }, 404);
  } catch (hiba) {
    if (hiba instanceof Error && hiba.message === "UTOLSO_TULAJDONOS") return valasz({ hiba: "Az utolsó aktív tulajdonosi fiók nem tiltható le." }, 409);
    if (hiba instanceof Prisma.PrismaClientKnownRequestError && hiba.code === "P2034") return valasz({ hiba: "Közben megváltozott egy kezelői fiók. Frissítsd a listát." }, 409);
    return valasz({ hiba: "A kezelői fiók módosítása nem sikerült." }, 500);
  }
}
