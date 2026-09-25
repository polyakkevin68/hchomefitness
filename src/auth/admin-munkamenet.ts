import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { canPerformAdminAction, type AdminAction, type AdminRole } from "./szerepkorok";
import { ellenorizAdminJelszot, hashAdminToken, ujAdminToken } from "./admin-hitelesites";

const probalkozasiAblakMs = 15 * 60 * 1000;
const probalkozasiLimit = 8;
export const adminSutiNeve = "hc-admin";
export const adminMunkamenetOra = 8;

export type AdminAzonosito = { id: string; email: string; role: AdminRole };

const probaJelszoHash = `scrypt$16384$8$1$${"A".repeat(22)}$${"A".repeat(86)}`;

function lenyomat(ertek: string) {
  return createHash("sha256").update(ertek).digest("hex");
}

function adminSzerep(ertek: string): ertek is AdminRole {
  return ertek === "OWNER" || ertek === "OPERATIONS" || ertek === "FINANCE" || ertek === "CONTENT" || ertek === "READ_ONLY";
}

export async function letrehozAdminMunkamenetet(emailInput: string, jelszo: string, forrasAzonosito: string) {
  const email = emailInput.trim().toLowerCase();
  const azonositolenyomat = lenyomat(email);
  const forrasLenyomat = lenyomat(forrasAzonosito.slice(0, 300));
  const idopont = new Date();
  const probalkozasKezdete = new Date(idopont.getTime() - probalkozasiAblakMs);
  const hibasProba = await prisma.adminLoginAttempt.count({
    where: { identityHash: azonositolenyomat, succeeded: false, createdAt: { gte: probalkozasKezdete } },
  });
  const user = await prisma.adminUser.findUnique({ where: { email } });
  const jelszoJo = await ellenorizAdminJelszot(jelszo, user?.passwordHash ?? probaJelszoHash);
  const sikeres = hibasProba < probalkozasiLimit && Boolean(user?.isActive && jelszoJo && adminSzerep(user.role));

  await prisma.adminLoginAttempt.create({
    data: { adminUserId: user?.id ?? null, identityHash: azonositolenyomat, sourceHash: forrasLenyomat, succeeded: sikeres },
  });
  if (!sikeres || !user || !adminSzerep(user.role)) return null;

  const token = ujAdminToken();
  const expiresAt = new Date(idopont.getTime() + adminMunkamenetOra * 60 * 60 * 1000);
  await prisma.adminSession.create({ data: { adminUserId: user.id, tokenHash: hashAdminToken(token), expiresAt } });
  return { token, expiresAt, admin: { id: user.id, email: user.email, role: user.role as AdminRole } };
}

export async function hitelesitAdminMunkamenetet(token: string | undefined, muvelet: AdminAction): Promise<AdminAzonosito | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashAdminToken(token) },
    include: { adminUser: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.adminUser.isActive
    || !adminSzerep(session.adminUser.role) || !canPerformAdminAction(session.adminUser.role, muvelet)) return null;
  return { id: session.adminUser.id, email: session.adminUser.email, role: session.adminUser.role };
}

export async function visszavonAdminMunkamenetet(token: string | undefined): Promise<void> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await prisma.adminSession.updateMany({ where: { tokenHash: hashAdminToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function naplozAdminMuvelet(adminUserId: string, muvelet: string, celTipus: string, celAzonosito: string | null, adatok: object = {}) {
  await prisma.adminAuditLog.create({
    data: { adminUserId, action: muvelet, targetType: celTipus, targetId: celAzonosito, details: adatok },
  });
}
