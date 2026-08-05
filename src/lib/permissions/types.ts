/**
 * Fine-grained permissions matrix (additive on top of admin | member | viewer).
 *
 * System role keys (unchanged meaning):
 * - admin  → Admin / Director
 * - member → Bid team member
 * - viewer → Viewer
 *
 * Additive system role:
 * - client → Client-portal (own Account/Projects scoping; view-leaning defaults)
 *
 * Custom roles use free-form keys (e.g. finance_viewer) stored in users.role.
 */

export const PERMISSION_MODULES = [
  "dashboard",
  "opportunities",
  "leads",
  "accounts",
  "pmo",
  "ideas",
  "compliance",
  "proposals",
  "invoices",
  "chat",
  "discussions",
  "calendar",
  "documents",
  "settings",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Actions that apply per module (UI + seed omit the rest). */
export const MODULE_ACTIONS: Record<PermissionModule, PermissionAction[]> = {
  dashboard: ["view", "export"],
  opportunities: ["view", "create", "edit", "delete", "approve", "export"],
  leads: ["view", "create", "edit", "delete", "export"],
  accounts: ["view", "create", "edit", "delete", "export"],
  pmo: ["view", "create", "edit", "delete", "approve", "export"],
  ideas: ["view", "create", "edit", "delete", "approve"],
  compliance: ["view", "create", "edit", "delete", "export"],
  proposals: ["view", "create", "edit", "delete", "approve", "export"],
  invoices: ["view", "create", "edit", "delete", "approve", "export"],
  chat: ["view", "create", "edit", "delete"],
  discussions: ["view", "create", "edit", "delete"],
  calendar: ["view", "create", "edit", "delete"],
  documents: ["view", "create", "edit", "delete", "export"],
  settings: ["view", "edit"],
};

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  opportunities: "Opportunities / Pipeline",
  leads: "Leads",
  accounts: "Accounts",
  pmo: "PMO / Projects",
  ideas: "Ideas & R&D",
  compliance: "Compliance vault",
  proposals: "Proposals",
  invoices: "Invoices / Finance",
  chat: "Chat",
  discussions: "Discussions",
  calendar: "Calendar",
  documents: "Documents",
  settings: "Settings",
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
};

/** Built-in role keys. Custom roles are additional string keys. */
export const SYSTEM_ROLE_KEYS = ["admin", "member", "viewer", "client"] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export type RoleKey = string;

export type AppRole = {
  key: RoleKey;
  name: string;
  description: string;
  isSystem: boolean;
};

export type RolePermission = {
  roleKey: RoleKey;
  module: PermissionModule;
  action: PermissionAction;
  allowed: boolean;
};

export type PermissionKey = `${PermissionModule}:${PermissionAction}`;

export function permissionKey(
  module: PermissionModule,
  action: PermissionAction,
): PermissionKey {
  return `${module}:${action}`;
}

export function parsePermissionKey(
  key: string,
): { module: PermissionModule; action: PermissionAction } | null {
  const [module, action] = key.split(":");
  if (
    !PERMISSION_MODULES.includes(module as PermissionModule) ||
    !PERMISSION_ACTIONS.includes(action as PermissionAction)
  ) {
    return null;
  }
  return {
    module: module as PermissionModule,
    action: action as PermissionAction,
  };
}

export const USER_STATUSES = [
  "active",
  "invited",
  "suspended",
  "deactivated",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
