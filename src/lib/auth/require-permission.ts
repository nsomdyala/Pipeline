import "server-only";

import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { findUserById, touchLastActive } from "@/lib/auth/users";
import { roleAllows } from "@/lib/permissions/store";
import type {
  PermissionAction,
  PermissionModule,
} from "@/lib/permissions/types";

export async function requireSession(): Promise<
  { ok: true; session: SessionUser } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in required." },
        { status: 401 },
      ),
    };
  }

  // Reject suspended / deactivated accounts even if cookie is still valid.
  try {
    const fresh = await findUserById(session.id);
    if (fresh && (fresh.status === "suspended" || fresh.status === "deactivated")) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "This account is not active." },
          { status: 403 },
        ),
      };
    }
    if (fresh) {
      void touchLastActive(fresh.id);
      return { ok: true, session: fresh };
    }
  } catch {
    // DB unavailable — fall through with cookie session.
  }

  return { ok: true, session };
}

/**
 * Central permission gate for API routes.
 * Uses the role_permissions matrix (seeded defaults preserve prior behaviour).
 */
export async function requirePermission(
  module: PermissionModule,
  action: PermissionAction,
): Promise<
  { ok: true; session: SessionUser } | { ok: false; response: NextResponse }
> {
  const auth = await requireSession();
  if (!auth.ok) return auth;

  const allowed = await roleAllows(auth.session.role, module, action);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Missing permission: ${module}:${action}.`,
        },
        { status: 403 },
      ),
    };
  }

  return auth;
}

/** Users & Permissions management — Admin/Director only (not custom roles). */
export async function requireUsersAdmin(): Promise<
  { ok: true; session: SessionUser } | { ok: false; response: NextResponse }
> {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  if (auth.session.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only Admin / Director can manage users and roles." },
        { status: 403 },
      ),
    };
  }
  return auth;
}
