import { NextResponse } from "next/server";
import { getSession, roleLabel } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { defaultAllows } from "@/lib/permissions/defaults";
import { permissionKeysForRole } from "@/lib/permissions/store";
import {
  MODULE_ACTIONS,
  PERMISSION_MODULES,
  type PermissionModule,
} from "@/lib/permissions/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const fresh = (await findUserById(session.id)) ?? session;

  let permissions: string[] = [];
  try {
    permissions = await permissionKeysForRole(fresh.role);
  } catch {
    permissions = PERMISSION_MODULES.flatMap((mod) =>
      MODULE_ACTIONS[mod]
        .filter((action) => defaultAllows(fresh.role, mod, action))
        .map((action) => `${mod}:${action}`),
    );
  }

  const canViewModule = (mod: PermissionModule) =>
    permissions.includes(`${mod}:view`) || defaultAllows(fresh.role, mod, "view");

  return NextResponse.json({
    user: {
      id: fresh.id,
      name: fresh.name,
      email: fresh.email,
      role: fresh.role,
      roleLabel: roleLabel(fresh.role),
      avatarUrl: fresh.avatarUrl ?? null,
      status: fresh.status ?? "active",
      canManageUsers: fresh.role === "admin",
      permissions,
      nav: {
        dashboard: canViewModule("dashboard"),
        opportunities: canViewModule("opportunities"),
        leads: canViewModule("leads"),
        accounts: canViewModule("accounts"),
        pmo: canViewModule("pmo"),
        ideas: canViewModule("ideas"),
        compliance: canViewModule("compliance"),
        proposals: canViewModule("proposals"),
        chat: canViewModule("chat"),
        discussions: canViewModule("discussions"),
        calendar: canViewModule("calendar"),
        settings: canViewModule("settings") || true,
      },
    },
  });
}
