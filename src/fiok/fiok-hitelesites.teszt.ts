import { describe, expect, it } from "vitest";
import { ellenorizFiokJelszot, hashFiokJelszot, hashFiokToken, ujFiokToken } from "./fiok-hitelesites";

describe("vásárlói fiók hitelesítése", () => {
  it("sózott jelszólenyomatot készít és biztonságosan ellenőrzi", async () => {
    const egyik = await hashFiokJelszot("hosszú és egyedi vásárlói jelszó");
    const masik = await hashFiokJelszot("hosszú és egyedi vásárlói jelszó");

    expect(egyik).not.toBe(masik);
    expect(await ellenorizFiokJelszot("hosszú és egyedi vásárlói jelszó", egyik)).toBe(true);
    expect(await ellenorizFiokJelszot("másik jelszó", egyik)).toBe(false);
  });

  it("a rövid jelszót visszautasítja", async () => {
    await expect(hashFiokJelszot("rövid")).rejects.toThrow();
  });

  it("véletlen munkamenettokent ad, adatbázishoz pedig lenyomatot készít", () => {
    const egyik = ujFiokToken();
    const masik = ujFiokToken();

    expect(egyik).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(masik).not.toBe(egyik);
    expect(hashFiokToken(egyik)).not.toBe(egyik);
  });
});
