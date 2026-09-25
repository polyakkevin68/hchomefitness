import { describe, expect, it } from "vitest";
import { isHcHomeFitnessBrand } from "./marka-szabaly";

describe("HC márkaszűrés", () => {
  it("elfogadja a HC Home Fitness nevet kis- és nagybetűtől függetlenül", () => {
    expect(isHcHomeFitnessBrand("HC Home Fitness")).toBe(true);
    expect(isHcHomeFitnessBrand(" hc home fitness ")).toBe(true);
  });

  it("elutasítja az eltérő márkát és a hiányzó értéket", () => {
    expect(isHcHomeFitnessBrand("Másik márka")).toBe(false);
    expect(isHcHomeFitnessBrand("")).toBe(false);
  });
});
