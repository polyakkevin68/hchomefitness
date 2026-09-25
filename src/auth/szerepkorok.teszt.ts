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

  it("csak tulajdonos hagyhat jóvá katalógusterméket", () => {
    expect(canPerformAdminAction("OWNER", "publish_products")).toBe(true);
    expect(canPerformAdminAction("CONTENT", "publish_products")).toBe(false);
    expect(canPerformAdminAction("OPERATIONS", "publish_products")).toBe(false);
    expect(canPerformAdminAction("READ_ONLY", "publish_products")).toBe(false);
  });
});
