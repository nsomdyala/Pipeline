import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { DEFAULT_ROLE_META } from "@/lib/permissions/defaults";
import type { UserStatus } from "@/lib/permissions/types";
import type { UserRole } from "@/lib/settings/types";

export { DEMO_PASSWORD, SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * role is a system key (admin|member|viewer|client) or custom app_roles.key.
 * Kept loose (string) so custom roles do not break the session cookie shape.
 */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  status?: UserStatus;
};

export function encodeSession(user: SessionUser) {
  return Buffer.from(
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeSession(value: string | undefined): SessionUser | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as SessionUser;
    if (!parsed?.email || !parsed?.name || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

export function roleLabel(role: string) {
  const meta = DEFAULT_ROLE_META[role as keyof typeof DEFAULT_ROLE_META];
  if (meta) return meta.name;
  if (role === "admin") return "Admin / Director";
  if (role === "viewer") return "Viewer";
  if (role === "client") return "Client-portal";
  if (role === "member") return "Bid team member";
  // Custom role key → title-case-ish
  return role
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Narrow helper for legacy UserRole checks. */
export function asUserRole(role: string | null | undefined): UserRole | null {
  if (role === "admin" || role === "member" || role === "viewer") return role;
  if (role === "client") return "viewer"; // closest legacy stand-in for nav helpers
  return null;
}
