export type AdminRole = "OWNER" | "OPERATIONS" | "FINANCE" | "CONTENT" | "READ_ONLY";
export type AdminAction = "manage_users" | "manage_integrations" | "manage_orders" | "confirm_stock" | "issue_refund" | "manage_invoices" | "edit_content" | "view_operations";

const engedelyek: Record<AdminRole, ReadonlySet<AdminAction>> = {
  OWNER: new Set(["manage_users", "manage_integrations", "manage_orders", "confirm_stock", "issue_refund", "manage_invoices", "edit_content", "view_operations"]),
  OPERATIONS: new Set(["manage_orders", "confirm_stock", "view_operations"]),
  FINANCE: new Set(["issue_refund", "manage_invoices", "view_operations"]),
  CONTENT: new Set(["edit_content"]),
  READ_ONLY: new Set(["view_operations"]),
};

export function canPerformAdminAction(role: AdminRole, action: AdminAction): boolean {
  return engedelyek[role].has(action);
}

// This is a policy primitive, not authentication. Call sites must load and verify a server-side session first.
