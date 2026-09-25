import { describe, expect, it } from "vitest";
import { biztonsagiFejlecek } from "./biztonsagi-fejlecek";

describe("biztonsági HTTP-fejlécek", () => {
  it("böngészőoldali védelemhez szükséges fejléceket ad", () => {
    expect(biztonsagiFejlecek(false)).toEqual(expect.arrayContaining([
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ]));
  });

  it("csak éles környezetben kér HTTPS-t a további kérésekhez", () => {
    expect(biztonsagiFejlecek(false).some(({ key }) => key === "Strict-Transport-Security")).toBe(false);
    expect(biztonsagiFejlecek(true)).toContainEqual({ key: "Strict-Transport-Security", value: "max-age=31536000" });
  });
});
