import { afterEach, describe, expect, it, vi } from "vitest";
import { logEvent } from "./naplozas";

afterEach(() => vi.restoreAllMocks());

describe("biztonságos eseménynapló", () => {
  it("csak az engedélyezett mezőket írja ki", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    logEvent("info", "teszt.esemeny", {
      requestId: "keres-1",
      email: "vasarlo@example.test",
      accessToken: "titkos-token",
    });

    const record = info.mock.calls[0][0] as string;
    expect(record).toContain('"requestId":"keres-1"');
    expect(record).not.toContain("vasarlo@example.test");
    expect(record).not.toContain("titkos-token");
  });

  it("kitakarja a kapcsolatcímet, Bearer tokent és titokértékeket a hibaszövegből", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    logEvent("error", "teszt.hiba", {
      errorMessage: "postgresql://user:db-secret@db.local/hc Bearer bearer-secret UNAS_API_KEY=unas-secret password=admin-secret",
    });

    const record = error.mock.calls[0][0] as string;
    for (const secret of ["user:db-secret", "db.local", "bearer-secret", "unas-secret", "admin-secret"]) {
      expect(record).not.toContain(secret);
    }
    expect(record).toContain("[ADATBAZIS-KAPCSOLAT-ELTAKARVA]");
    expect(record).toContain("Bearer [ELTAKARVA]");
    expect(record).toContain("UNAS_API_KEY=[ELTAKARVA]");
    expect(record).toContain("password=[ELTAKARVA]");
  });
});
