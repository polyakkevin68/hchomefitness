import { describe, expect, it } from "vitest";
import { kategoriaSlug } from "./kategoria";

describe("kategória hivatkozás", () => {
  it("magyar ékezetekből stabil URL-t készít", () => {
    expect(kategoriaSlug("Szobakerékpárok & fitnesz" )).toBe("szobakerekparok-fitnesz");
  });
});
