import { defaultAllows } from "@/lib/permissions/defaults";

/**
 * Role mapping for executive Dashboard:
 * - Admin / Director → `admin` (full dashboard + finance that exists)
 * - Bid team member → `member` (scoped leads/accounts/projects; limited finance)
 * - Viewer / Client-portal → no dashboard (unless custom role grants it)
 * - Custom roles (e.g. finance_viewer) → matrix defaults
 */
export function canSeeDashboard(role: string | null | undefined): boolean {
  if (role === "admin" || role === "member") return true;
  if (role === "viewer" || role === "client") return false;
  return defaultAllows(role, "dashboard", "view");
}

/** Full finance KPIs (PO rollups + invoice-backed metrics when available). */
export function canSeeFullFinance(role: string | null | undefined): boolean {
  if (role === "admin") return true;
  if (role === "member" || role === "viewer" || role === "client") return false;
  return defaultAllows(role, "invoices", "view");
}

/** Pipeline bid value / win rate — visible to bid team, scoped for members. */
export function canSeePipelineFinance(
  role: string | null | undefined,
): boolean {
  if (role === "admin" || role === "member") return true;
  return defaultAllows(role, "invoices", "view") || defaultAllows(role, "dashboard", "export");
}
