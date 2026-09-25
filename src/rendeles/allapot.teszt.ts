import { describe, expect, it } from "vitest";
import { leptetRendelesAllapotot } from "./allapot";

describe("kézi készletmegerősítés rendelési állapota", () => {
  it("a függő igényt csak megerősített vagy elutasított állapotba lépteti", () => {
    expect(leptetRendelesAllapotot("PENDING_CONFIRMATION", "CONFIRMED")).toBe("CONFIRMED");
    expect(leptetRendelesAllapotot("PENDING_CONFIRMATION", "REJECTED")).toBe("REJECTED");
  });

  it("nem léptet vissza vagy módosít végleges állapotot", () => {
    expect(() => leptetRendelesAllapotot("CONFIRMED", "REJECTED")).toThrow();
    expect(() => leptetRendelesAllapotot("REJECTED", "CONFIRMED")).toThrow();
  });
});
