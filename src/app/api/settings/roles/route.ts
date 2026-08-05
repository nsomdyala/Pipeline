import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit/write";
import { requireUsersAdmin } from "@/lib/auth/require-permission";
import { countUsersWithRole } from "@/lib/auth/users";
import {
  MODULE_ACTIONS,
  MODULE_LABELS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/permissions/types";
import {
  createCustomRole,
  deleteCustomRole,
  listPermissionsForRole,
  listRoles,
  setRolePermissions,
  updateRoleMeta,
} from "@/lib/permissions/store";

export async function GET() {
  const auth = await requireUsersAdmin();
  if (!auth.ok) return auth.response;

  try {
    const roles = await listRoles();
    const withMatrix = await Promise.all(
      roles.map(async (role) => {
        const permissions = await listPermissionsForRole(role.key);
        const allowed = new Set(
          permissions.filter((p) => p.allowed).map((p) => `${p.module}:${p.action}`),
        );
        return {
          ...role,
          userCount: await countUsersWithRole(role.key),
          permissions: PERMISSION_MODULES.flatMap((module) =>
            MODULE_ACTIONS[module].map((action) => ({
              module,
              action,
              allowed: allowed.has(`${module}:${action}`),
            })),
          ),
        };
      }),
    );

    return NextResponse.json({
      roles: withMatrix,
      modules: PERMISSION_MODULES.map((key) => ({
        key,
        label: MODULE_LABELS[key],
        actions: MODULE_ACTIONS[key],
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load roles. Apply docs/sql/users-permissions.sql if tables are missing.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUsersAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    key?: string;
    name?: string;
    description?: string;
    permissions?: Array<{
      module: PermissionModule;
      action: PermissionAction;
      allowed?: boolean;
    }>;
  };

  try {
    const role = await createCustomRole({
      key: body.key ?? body.name ?? "",
      name: body.name ?? "",
      description: body.description,
      permissions: body.permissions,
    });
    await writeAudit({
      actorUserId: auth.session.id,
      actorEmail: auth.session.email,
      actorName: auth.session.name,
      entityType: "role",
      action: "create",
      diff: { key: role.key, name: role.name },
    });
    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create role." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUsersAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    key?: string;
    name?: string;
    description?: string;
    permissions?: Array<{
      module: PermissionModule;
      action: PermissionAction;
      allowed: boolean;
    }>;
  };

  if (!body.key) {
    return NextResponse.json({ error: "Role key is required." }, { status: 400 });
  }

  try {
    let role = null;
    if (body.name !== undefined || body.description !== undefined) {
      role = await updateRoleMeta(body.key, {
        name: body.name,
        description: body.description,
      });
    }
    if (body.permissions) {
      await setRolePermissions(body.key, body.permissions);
    }
    await writeAudit({
      actorUserId: auth.session.id,
      actorEmail: auth.session.email,
      actorName: auth.session.name,
      entityType: "role",
      action: "update",
      diff: {
        key: body.key,
        name: body.name,
        permissionsUpdated: Boolean(body.permissions),
      },
    });
    const permissions = await listPermissionsForRole(body.key);
    return NextResponse.json({ role, permissions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update role." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireUsersAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { key?: string };
  if (!body.key) {
    return NextResponse.json({ error: "Role key is required." }, { status: 400 });
  }

  try {
    const inUse = await countUsersWithRole(body.key);
    if (inUse > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role — ${inUse} user(s) still assigned. Reassign them first.`,
        },
        { status: 400 },
      );
    }
    await deleteCustomRole(body.key);
    await writeAudit({
      actorUserId: auth.session.id,
      actorEmail: auth.session.email,
      actorName: auth.session.name,
      entityType: "role",
      action: "delete",
      diff: { key: body.key },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete role." },
      { status: 400 },
    );
  }
}
