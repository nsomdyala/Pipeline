import "server-only";

import { requireUsersAdmin } from "@/lib/auth/require-permission";

/**
 * Admin / Director gate for user management APIs.
 * Delegates to requireUsersAdmin (same rule: role === "admin").
 */
export async function requireAdmin() {
  return requireUsersAdmin();
}
