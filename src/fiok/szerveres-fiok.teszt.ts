import { afterAll, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { ellenorizFiokJelszot, hashFiokToken, hashFiokJelszot, ujFiokToken } from "./fiok-hitelesites";
import { beleptetFiokot, fiokCimLetrehoz, fiokCimTorol, fiokCimek, fiokRendelesek, hitelesitFiokMunkamenetet, kijelentkeztetFiokot, kapcsolKorabbiRendelestFiokhoz } from "./szerveres-fiok";

const email = `acc-${randomUUID()}@example.test`;
const emailHash = createHash("sha256").update(email).digest("hex");
const nemIgazoltEmail = `${email}-nemigazolt`;
const nemIgazoltHash = createHash("sha256").update(nemIgazoltEmail).digest("hex");
let fiokId = "";
let rendelesId = "";

afterAll(async () => {
  if (fiokId) await prisma.vasarloiFiok.deleteMany({ where: { id: fiokId } });
  if (rendelesId) await prisma.order.deleteMany({ where: { publicId: rendelesId } });
  await prisma.vasarloiBelepesiProba.deleteMany({ where: { emailHash: { in: [emailHash, nemIgazoltHash] } } });
});

describe("vásárlói fiók PostgreSQL-en", () => {
  it("csak igazolt fiókot enged beléptetni, a munkamenetet visszavonja és a címeket fiókhoz köti", async () => {
    const jelszo = "egy hosszú egyedi vásárlói jelszó";
    const jelszoHash = await hashFiokJelszot(jelszo);
    const fiok = await prisma.vasarloiFiok.create({ data: { email, nev: "Minta Vevő", jelszoHash, emailIgazolvaAt: new Date() } });
    fiokId = fiok.id;

    expect(await beleptetFiokot(email, "hibás jelszó", "teszt-kliens")).toBeNull();
    expect(await beleptetFiokot(email, jelszo, "teszt-kliens")).toMatchObject({ fiok: { id: fiok.id, email } });
    const bejelentkezes = await beleptetFiokot(email, jelszo, "másik-teszt-kliens");
    expect(bejelentkezes).not.toBeNull();
    expect(await ellenorizFiokJelszot(jelszo, jelszoHash)).toBe(true);
    const mentettMunkamenet = await prisma.vasarloiMunkamenet.findUnique({ where: { tokenHash: hashFiokToken(bejelentkezes!.token) } });
    expect(mentettMunkamenet?.tokenHash).not.toBe(bejelentkezes!.token);
    expect(await hitelesitFiokMunkamenetet(bejelentkezes!.token)).toMatchObject({ id: fiok.id, email });

    const cim1 = await fiokCimLetrehoz(fiok.id, { nev: "Minta Vevő", iranyitoszam: "1111", telepules: "Budapest", cim: "Minta utca 1.", alapertelmezett: false });
    const cim2 = await fiokCimLetrehoz(fiok.id, { nev: "Munkahely", iranyitoszam: "2222", telepules: "Budapest", cim: "Másik utca 2.", alapertelmezett: true });
    expect((await fiokCimek(fiok.id)).find((cim) => cim.alapertelmezett)?.id).toBe(cim2.id);
    expect(await fiokCimTorol(fiok.id, cim2.id)).toBe(true);
    expect((await fiokCimek(fiok.id)).find((cim) => cim.alapertelmezett)?.id).toBe(cim1.id);
    const publicId = `HC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const vendegToken = ujFiokToken();
    rendelesId = publicId;
    await prisma.order.create({ data: { publicId, customerEmail: email, totalHuf: 123_400, idempotencyKey: randomUUID(), guestAccessHash: createHash("sha256").update(vendegToken).digest("hex") } });
    expect(await kapcsolKorabbiRendelestFiokhoz(fiok.id, email, publicId, "rossz-vendeg-token" )).toBe(false);
    expect(await kapcsolKorabbiRendelestFiokhoz(fiok.id, "idegen@example.test", publicId, vendegToken)).toBe(false);
    expect(await kapcsolKorabbiRendelestFiokhoz(fiok.id, email, publicId, vendegToken)).toBe(true);
    expect(await kapcsolKorabbiRendelestFiokhoz(fiok.id, email, publicId, vendegToken)).toBe(true);
    expect(await fiokRendelesek(fiok.id)).toHaveLength(1);

    await kijelentkeztetFiokot(bejelentkezes!.token);
    expect(await hitelesitFiokMunkamenetet(bejelentkezes!.token)).toBeNull();
  });

  it("az igazolatlan e-mailhez nem ad belépést", async () => {
    const ugyfel = await prisma.vasarloiFiok.create({ data: { email: nemIgazoltEmail, jelszoHash: `scrypt$16384$8$1$${"A".repeat(22)}$${"A".repeat(86)}` } });
    try {
      const eredmeny = await beleptetFiokot(ugyfel.email, "tetszőleges jelszó", "teszt-kliens");
      expect(eredmeny).toBeNull();
    } finally { await prisma.vasarloiFiok.delete({ where: { id: ugyfel.id } }); }
  });
});
