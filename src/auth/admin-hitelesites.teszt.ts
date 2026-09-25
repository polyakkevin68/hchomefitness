import { describe, expect, it } from "vitest";
import { hashAdminJelszot, ellenorizAdminJelszot, hashAdminToken, ujAdminToken } from "./admin-hitelesites";

describe("admin hitelesítési alapok", () => {
  it("a jelszót véletlen sóval tárolható alakra alakítja és ellenőrzi", async () => {
    const hash = await hashAdminJelszot("egy-hosszú-tesztjelszó-2026");
    expect(hash).not.toContain("egy-hosszú-tesztjelszó-2026");
    expect(await ellenorizAdminJelszot("egy-hosszú-tesztjelszó-2026", hash)).toBe(true);
    expect(await ellenorizAdminJelszot("másik-hibás-jelszó", hash)).toBe(false);
  });

  it("minden jelszóhashhez külön sót és minden munkamenethez véletlen titkot készít", async () => {
    const elso = await hashAdminJelszot("egy-hosszú-tesztjelszó-2026");
    const masodik = await hashAdminJelszot("egy-hosszú-tesztjelszó-2026");
    expect(elso).not.toBe(masodik);
    const egyik = ujAdminToken();
    const masik = ujAdminToken();
    expect(egyik).not.toBe(masik);
    expect(hashAdminToken(egyik)).not.toBe(egyik);
  });

  it("hibás vagy túl rövid jelszóval nem végez drága hashműveletet", async () => {
    await expect(hashAdminJelszot("rövid")).rejects.toThrow(/legalább 14/i);
    expect(await ellenorizAdminJelszot("rövid", "hibás-adatbázis-érték")).toBe(false);
  });
});
