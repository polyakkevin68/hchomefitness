import { describe, expect, it } from "vitest";
import { canPerformAdminAction } from "./szerepkorok";

describe("adminisztrátori szerepkörök", () => {
  it("a tartalomszerkesztő nem fér hozzá a visszatérítéshez", () => {
    expect(canPerformAdminAction("CONTENT", "issue_refund")).toBe(false);
    expect(canPerformAdminAction("CONTENT", "edit_content")).toBe(true);
  });

  it("pénzügyi szerepkör nem kezel adminfelhasználókat", () => {
    expect(canPerformAdminAction("FINANCE", "manage_users")).toBe(false);
    expect(canPerformAdminAction("FINANCE", "manage_invoices")).toBe(true);
  });
});
