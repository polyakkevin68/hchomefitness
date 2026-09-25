import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { hashAdminJelszot, hashAdminToken } from "./admin-hitelesites";
import { hitelesitAdminMunkamenetet, letrehozAdminMunkamenetet, visszavonAdminMunkamenetet } from "./admin-munkamenet";

const felhasznalok: string[] = [];

afterAll(async () => {
  if (felhasznalok.length) await prisma.adminUser.deleteMany({ where: { id: { in: felhasznalok } } });
});

async function tesztAdmin(role: string) {
  const azonosito = randomBytes(8).toString("hex");
  const admin = await prisma.adminUser.create({
    data: { email: `admin-${azonosito}@example.test`, passwordHash: await hashAdminJelszot("hosszú-teszt-jelszó-2026"), role },
  });
  felhasznalok.push(admin.id);
  return admin;
}

describe("adminmunkamenet és szerepkör", () => {
  it("titkos sütimunkamenetet hoz létre, és a jogosultságot kérésenként ellenőrzi", async () => {
    const admin = await tesztAdmin("OPERATIONS");
    const munkamenet = await letrehozAdminMunkamenetet(admin.email, "hosszú-teszt-jelszó-2026", "helyi-próba");
    expect(munkamenet?.admin.role).toBe("OPERATIONS");
    const sor = await prisma.adminSession.findUnique({ where: { tokenHash: hashAdminToken(munkamenet!.token) } });
    expect(sor?.tokenHash).not.toContain(munkamenet!.token);
    expect(await hitelesitAdminMunkamenetet(munkamenet?.token, "manage_orders")).toMatchObject({ id: admin.id });
    expect(await hitelesitAdminMunkamenetet(munkamenet?.token, "manage_users")).toBeNull();
    await visszavonAdminMunkamenetet(munkamenet?.token);
    expect(await hitelesitAdminMunkamenetet(munkamenet?.token, "manage_orders")).toBeNull();
  });

  it("érvénytelen jelszóval nem ad munkamenetet, és pénzügyi szerep nem igazol készletet", async () => {
    const admin = await tesztAdmin("FINANCE");
    expect(await letrehozAdminMunkamenetet(admin.email, "hibás-jelszó", "helyi-próba")).toBeNull();
    const session = await letrehozAdminMunkamenetet(admin.email, "hosszú-teszt-jelszó-2026", "helyi-próba");
    expect(await hitelesitAdminMunkamenetet(session?.token, "confirm_stock")).toBeNull();
  });
});
