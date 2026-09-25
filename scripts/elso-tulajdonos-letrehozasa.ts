import { prisma } from "../src/lib/adatbazis-kapcsolat";
import { hashAdminJelszot } from "../src/auth/admin-hitelesites";

async function main() {
  const email = process.env.ADMIN_INITIAL_OWNER_EMAIL?.trim().toLowerCase();
  const jelszo = process.env.ADMIN_INITIAL_OWNER_PASSWORD;
  delete process.env.ADMIN_INITIAL_OWNER_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Az ADMIN_INITIAL_OWNER_EMAIL érvényes e-mail-cím legyen.");
  if (!jelszo) throw new Error("Az ADMIN_INITIAL_OWNER_PASSWORD nincs beállítva.");
  if (await prisma.adminUser.count({ where: { role: "OWNER", isActive: true } })) throw new Error("Már létezik aktív OWNER; a kezdeti létrehozás csak egyszer futtatható.");
  const passwordHash = await hashAdminJelszot(jelszo);
  await prisma.adminUser.create({ data: { email, passwordHash, role: "OWNER" } });
  console.log("Az első tulajdonosi hozzáférés elkészült. A jelszó nem lett kiírva.");
}

main().catch((hiba: unknown) => {
  console.error(hiba instanceof Error ? hiba.message : "A tulajdonosi hozzáférés létrehozása nem sikerült.");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
