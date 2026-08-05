import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appRoles, rolePermissions } from "@/db/schema";
import {
  DEFAULT_PERMISSION_MATRIX,
  DEFAULT_ROLE_META,
  defaultAllows,
  defaultPermissionKeys,
} from "@/lib/permissions/defaults";
import {
  MODULE_ACTIONS,
  PERMISSION_MODULES,
  SYSTEM_ROLE_KEYS,
  type AppRole,
  type PermissionAction,
  type PermissionModule,
  type RoleKey,
} from "@/lib/permissions/types";

let seeded = false;

function matrixRows(roleKey: RoleKey) {
  const rows: {
    roleKey: string;
    module: string;
    action: string;
    allowed: boolean;
  }[] = [];
  if (roleKey === "admin") {
    for (const mod of PERMISSION_MODULES) {
      for (const action of MODULE_ACTIONS[mod]) {
        rows.push({ roleKey, module: mod, action, allowed: true });
      }
    }
    return rows;
  }
  const matrix = DEFAULT_PERMISSION_MATRIX[roleKey] ?? {};
  for (const mod of PERMISSION_MODULES) {
    for (const action of matrix[mod] ?? []) {
      rows.push({ roleKey, module: mod, action, allowed: true });
    }
  }
  return rows;
}

/** Idempotent seed of system + finance_viewer roles and matrices. */
export async function ensurePermissionsSeeded() {
  if (seeded) return;
  if (!process.env.DATABASE_URL) return;

  const seedKeys = [
    ...SYSTEM_ROLE_KEYS,
    "finance_viewer",
  ] as const;

  for (const key of seedKeys) {
    const meta = DEFAULT_ROLE_META[key];
    await db
      .insert(appRoles)
      .values({
        key,
        name: meta.name,
        description: meta.description,
        isSystem: meta.isSystem,
      })
      .onConflictDoUpdate({
        target: appRoles.key,
        set: {
          name: meta.name,
          description: meta.description,
          isSystem: meta.isSystem,
          updatedAt: new Date(),
        },
      });

    const existing = await db
      .select({ id: rolePermissions.id })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleKey, key))
      .limit(1);

    if (existing.length === 0) {
      const rows = matrixRows(key);
      if (rows.length > 0) {
        await db.insert(rolePermissions).values(rows);
      }
    }
  }

  seeded = true;
}

export async function listRoles(): Promise<AppRole[]> {
  await ensurePermissionsSeeded();
  const rows = await db.select().from(appRoles).orderBy(asc(appRoles.name));
  return rows.map((r) => ({
    key: r.key,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
  }));
}

export async function getRole(key: RoleKey): Promise<AppRole | null> {
  await ensurePermissionsSeeded();
  const rows = await db
    .select()
    .from(appRoles)
    .where(eq(appRoles.key, key))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    key: r.key,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
  };
}

export async function createCustomRole(input: {
  key: string;
  name: string;
  description?: string;
  permissions?: Array<{
    module: PermissionModule;
    action: PermissionAction;
    allowed?: boolean;
  }>;
}): Promise<AppRole> {
  await ensurePermissionsSeeded();
  const key = input.key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_|_$/g, "");
  const name = input.name.trim();
  if (!key || !name) throw new Error("Role key and name are required.");
  if (SYSTEM_ROLE_KEYS.includes(key as (typeof SYSTEM_ROLE_KEYS)[number])) {
    throw new Error("That key is reserved for a system role.");
  }

  const existing = await getRole(key);
  if (existing) throw new Error("A role with that key already exists.");

  const [row] = await db
    .insert(appRoles)
    .values({
      key,
      name,
      description: input.description?.trim() ?? "",
      isSystem: false,
    })
    .returning();

  if (input.permissions?.length) {
    await db.insert(rolePermissions).values(
      input.permissions.map((p) => ({
        roleKey: key,
        module: p.module,
        action: p.action,
        allowed: p.allowed !== false,
      })),
    );
  }

  return {
    key: row.key,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
  };
}

export async function updateRoleMeta(
  key: RoleKey,
  input: { name?: string; description?: string },
) {
  await ensurePermissionsSeeded();
  const [row] = await db
    .update(appRoles)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(appRoles.key, key))
    .returning();
  if (!row) throw new Error("Role not found.");
  return {
    key: row.key,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
  };
}

export async function listPermissionsForRole(roleKey: RoleKey) {
  await ensurePermissionsSeeded();
  const rows = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.roleKey, roleKey));
  return rows.map((r) => ({
    roleKey: r.roleKey,
    module: r.module as PermissionModule,
    action: r.action as PermissionAction,
    allowed: r.allowed,
  }));
}

export async function setRolePermissions(
  roleKey: RoleKey,
  permissions: Array<{
    module: PermissionModule;
    action: PermissionAction;
    allowed: boolean;
  }>,
) {
  await ensurePermissionsSeeded();
  const role = await getRole(roleKey);
  if (!role) throw new Error("Role not found.");

  await db.delete(rolePermissions).where(eq(rolePermissions.roleKey, roleKey));
  const allowed = permissions.filter((p) => p.allowed);
  if (allowed.length > 0) {
    await db.insert(rolePermissions).values(
      allowed.map((p) => ({
        roleKey,
        module: p.module,
        action: p.action,
        allowed: true,
      })),
    );
  }
  return listPermissionsForRole(roleKey);
}

export async function roleAllows(
  role: RoleKey | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
): Promise<boolean> {
  if (!role) return false;
  if (!MODULE_ACTIONS[module].includes(action)) return false;

  try {
    await ensurePermissionsSeeded();
    const rows = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleKey, role),
          eq(rolePermissions.module, module),
          eq(rolePermissions.action, action),
        ),
      )
      .limit(1);
    if (rows[0]) return rows[0].allowed;
  } catch {
    // Fall through to defaults if tables are not migrated yet.
  }

  return defaultAllows(role, module, action);
}

export async function permissionKeysForRole(role: RoleKey): Promise<string[]> {
  try {
    await ensurePermissionsSeeded();
    const rows = await listPermissionsForRole(role);
    if (rows.length > 0) {
      return rows.filter((r) => r.allowed).map((r) => `${r.module}:${r.action}`);
    }
  } catch {
    // unmigrated
  }
  return defaultPermissionKeys(role);
}

export async function deleteCustomRole(key: RoleKey) {
  await ensurePermissionsSeeded();
  const role = await getRole(key);
  if (!role) throw new Error("Role not found.");
  if (role.isSystem) throw new Error("System roles cannot be deleted.");
  await db.delete(appRoles).where(eq(appRoles.key, key));
}
