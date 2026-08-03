import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import type { UserRole } from "@/lib/settings/types";

export { DEMO_PASSWORD, SESSION_COOKIE } from "@/lib/auth/constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export function encodeSession(user: SessionUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
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

export function roleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "viewer") return "Viewer";
  return "Bid team member";
}
