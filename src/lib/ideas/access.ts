import { defaultAllows } from "@/lib/permissions/defaults";

/**
 * Role mapping for Ideas & R&D:
 * - Admin / Director → `admin` (approve/reject/park, see all, manage R&D)
 * - Bid team member → `member` (submit ideas, comment/score, track R&D)
 * - Viewer / Client-portal → no Ideas & R&D nav (client-portal stand-in)
 * - Custom roles → permission matrix (`ideas` module)
 */
export function canSeeIdeasNav(role: string | null | undefined): boolean {
  if (role === "admin" || role === "member") return true;
  if (role === "viewer" || role === "client") return false;
  return defaultAllows(role, "ideas", "view");
}

export function canAccessIdeas(role: string | null | undefined): boolean {
  return canSeeIdeasNav(role);
}

export function canSubmitIdea(role: string | null | undefined): boolean {
  if (role === "admin" || role === "member") return true;
  if (role === "viewer" || role === "client") return false;
  return defaultAllows(role, "ideas", "create");
}

export function canReviewIdea(role: string | null | undefined): boolean {
  if (role === "admin") return true;
  if (role === "member" || role === "viewer" || role === "client") return false;
  return defaultAllows(role, "ideas", "approve");
}

export function canManageRd(role: string | null | undefined): boolean {
  if (role === "admin" || role === "member") return true;
  if (role === "viewer" || role === "client") return false;
  return (
    defaultAllows(role, "ideas", "edit") || defaultAllows(role, "ideas", "view")
  );
}
