import { describe, expect, it } from "vitest";
import { forrasAdatFriss } from "./forras-adat-frissesseg";

describe("forrásadat frissessége", () => {
  const most = new Date("2026-09-24T12:00:00.000Z");

  it("frissnek tekinti a határidőn belül importált adatot", () => {
    expect(forrasAdatFriss(new Date(most.getTime() - 60_000), 3600, most)).toBe(true);
  });

  it("lejártnak tekinti a határidővel egykorú adatot", () => {
    expect(forrasAdatFriss(new Date(most.getTime() - 3600_000), 3600, most)).toBe(false);
  });

  it("hiányzó, érvénytelen vagy jövőbeli importidőt nem fogad el", () => {
    expect(forrasAdatFriss(null, 3600, most)).toBe(false);
    expect(forrasAdatFriss(new Date(Number.NaN), 3600, most)).toBe(false);
    expect(forrasAdatFriss(new Date(most.getTime() + 1), 3600, most)).toBe(false);
  });

  it("érvénytelen határidőt nem fogad el", () => {
    expect(forrasAdatFriss(new Date(most.getTime() - 1000), 0, most)).toBe(false);
    expect(forrasAdatFriss(new Date(most.getTime() - 1000), -1, most)).toBe(false);
  });
});
