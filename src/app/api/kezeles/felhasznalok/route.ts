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
