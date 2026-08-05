import { defaultAllows } from "@/lib/permissions/defaults";

/**
 * Role mapping for PMO:
 * - Admin / Director → `admin` (sees all projects + PMO nav)
 * - Bid team member → `member` (sees assigned projects only + PMO nav)
 * - Viewer / Client-portal → client may view own projects (scoping in store);
 *   viewer has no PMO nav by prior behaviour
 * - Custom roles → matrix
 */
export function canSeePmoNav(role: string | null | undefined): boolean {
  if (role === "admin" || role === "member") return true;
  if (role === "viewer") return false;
  if (role === "client") return defaultAllows(role, "pmo", "view");
  return defaultAllows(role, "pmo", "view");
}

export function canSeeAllPmoProjects(role: string | null | undefined): boolean {
  return role === "admin";
}

export function canAccessPmo(role: string | null | undefined): boolean {
  return canSeePmoNav(role);
}
