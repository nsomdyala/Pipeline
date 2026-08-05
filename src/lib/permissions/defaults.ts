import {
  MODULE_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionModule,
  type RoleKey,
  type SystemRoleKey,
} from "@/lib/permissions/types";

export type PermissionMatrix = Record<
  string,
  Partial<Record<PermissionModule, PermissionAction[]>>
>;

function allActions(): Partial<
  Record<PermissionModule, PermissionAction[]>
> {
  const out: Partial<Record<PermissionModule, PermissionAction[]>> = {};
  for (const mod of PERMISSION_MODULES) {
    out[mod] = [...MODULE_ACTIONS[mod]];
  }
  return out;
}

function viewOnly(
  modules: PermissionModule[],
): Partial<Record<PermissionModule, PermissionAction[]>> {
  const out: Partial<Record<PermissionModule, PermissionAction[]>> = {};
  for (const mod of modules) {
    if (MODULE_ACTIONS[mod].includes("view")) out[mod] = ["view"];
  }
  return out;
}

/**
 * Sensible defaults matching prior admin/member/viewer behaviour.
 * Client-portal = view on own Account/Projects (+ documents/calendar lightly).
 * Finance viewer demo = view+export on invoices + dashboard only.
 */
export const DEFAULT_ROLE_META: Record<
  SystemRoleKey | "finance_viewer",
  { name: string; description: string; isSystem: boolean }
> = {
  admin: {
    name: "Admin / Director",
    description: "Full access to every module, including users and settings.",
    isSystem: true,
  },
  member: {
    name: "Bid team member",
    description: "Day-to-day bid work across pipeline, accounts, and delivery.",
    isSystem: true,
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access across most modules; no Settings edits.",
    isSystem: true,
  },
  client: {
    name: "Client-portal",
    description:
      "External client access — view own Account and Projects only (data scoping applies).",
    isSystem: true,
  },
  finance_viewer: {
    name: "Finance viewer",
    description: "Demo custom role — Dashboard and Invoices/Finance view + export.",
    isSystem: false,
  },
};

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  admin: allActions(),
  member: {
    dashboard: ["view", "export"],
    opportunities: ["view", "create", "edit", "delete", "export"],
    leads: ["view", "create", "edit", "delete", "export"],
    accounts: ["view", "create", "edit", "delete", "export"],
    pmo: ["view", "create", "edit", "export"],
    ideas: ["view", "create", "edit"],
    compliance: ["view", "create", "edit", "export"],
    proposals: ["view", "create", "edit", "export"],
    invoices: ["view", "export"],
    chat: ["view", "create", "edit", "delete"],
    discussions: ["view", "create", "edit", "delete"],
    calendar: ["view", "create", "edit", "delete"],
    documents: ["view", "create", "edit", "export"],
    settings: ["view"],
  },
  // Preserve prior behaviour: no executive Dashboard / PMO / Ideas for viewers.
  viewer: viewOnly([
    "opportunities",
    "leads",
    "accounts",
    "compliance",
    "proposals",
    "invoices",
    "chat",
    "discussions",
    "calendar",
    "documents",
    "settings",
  ]),
  client: {
    accounts: ["view"],
    pmo: ["view"],
    documents: ["view"],
    calendar: ["view"],
    chat: ["view", "create"],
    discussions: ["view", "create"],
    // No ideas module — client-portal does not see Ideas & R&D
  },
  finance_viewer: {
    dashboard: ["view", "export"],
    invoices: ["view", "export"],
  },
};

/** Sync lookup used by UI/nav when DB matrix is unavailable. */
export function defaultAllows(
  role: RoleKey | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  if (!role) return false;
  if (role === "admin") return MODULE_ACTIONS[module].includes(action);
  const allowed = DEFAULT_PERMISSION_MATRIX[role]?.[module] ?? [];
  return allowed.includes(action);
}

export function defaultPermissionKeys(role: RoleKey): string[] {
  const keys: string[] = [];
  const matrix = DEFAULT_PERMISSION_MATRIX[role];
  if (role === "admin") {
    for (const mod of PERMISSION_MODULES) {
      for (const action of MODULE_ACTIONS[mod]) {
        keys.push(`${mod}:${action}`);
      }
    }
    return keys;
  }
  if (!matrix) return keys;
  for (const mod of PERMISSION_MODULES) {
    for (const action of matrix[mod] ?? []) {
      keys.push(`${mod}:${action}`);
    }
  }
  return keys;
}
