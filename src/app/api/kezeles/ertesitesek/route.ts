import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { prisma } from "@/lib/adatbazis-kapcsolat";

export const dynamic = "force-dynamic";
const bemenet = z.object({ muvelet: z.literal("ujraprobal"), ertesitesId: z.string().min(1).max(64) }).strict();

function valasz(adat: unknown, status = 200) {
  return NextResponse.json(adat, { status, headers: { "Cache-Control": "private, no-store" } });
}

function eredetHelyes(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

export async function GET(request: NextRequest) {
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_notifications");
  if (!admin) return valasz({ hiba: "Ehhez az értesítési listához nincs jogosultságod." }, 401);
  const sor = await prisma.notification.findMany({
    where: { state: { in: ["PENDING", "PROCESSING", "UNKNOWN", "FAILED", "SENT", "DELIVERED", "BOUNCED"] } },
    orderBy: { updatedAt: "desc" }, take: 100,
    select: { id: true, type: true, state: true, attempts: true, providerMessageId: true, lastError: true, sentAt: true, updatedAt: true, order: { select: { publicId: true, customerEmail: true } } },
  });
  return valasz({ ertesitesek: sor.map(({ id, type, state, attempts, providerMessageId, lastError, sentAt, updatedAt, order }) => ({
    id, type, allapot: state, probalkozasok: attempts, szolgaltatoiUzenet: providerMessageId,
    hiba: lastError, elkuldveAt: sentAt?.toISOString() ?? null, frissitveAt: updatedAt.toISOString(),
    rendelesAzonosito: order.publicId, cimzett: order.customerEmail,
  })) });
}

export async function POST(request: NextRequest) {
  if (!eredetHelyes(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_notifications");
  if (!admin) return valasz({ hiba: "Ehhez az értesítési művelethez nincs jogosultságod." }, 403);
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "Az értesítési művelet adatai nem érvényesek." }, 400);
  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.notification.updateMany({ where: { id: parsed.data.ertesitesId, state: "FAILED" }, data: { state: "PENDING", lastError: null } });
      if (changed.count !== 1) throw new Error("NOTIFICATION_NOT_RETRYABLE");
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "notification_requeued", targetType: "Notification", targetId: parsed.data.ertesitesId, details: { reason: "ADMIN_RETRY_AFTER_DEFINITE_PROVIDER_FAILURE" } } });
    });
    return valasz({ sikeres: true });
  } catch (hiba) {
    if (hiba instanceof Error && hiba.message === "NOTIFICATION_NOT_RETRYABLE") return valasz({ hiba: "Csak biztos szolgáltatói hiba után indítható újra. A bizonytalan küldést ne ismételd meg." }, 409);
    return valasz({ hiba: "Az értesítés újrapróbálása nem rögzíthető." }, 500);
  }
}
