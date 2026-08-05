import "server-only";

import { listAccounts } from "@/lib/accounts/store";
import {
  canSeeDashboard,
  canSeeFullFinance,
  canSeePipelineFinance,
} from "@/lib/dashboard/access";
import { aggregateDashboard } from "@/lib/dashboard/aggregate";
import type {
  DashboardFilters,
  DashboardSnapshot,
} from "@/lib/dashboard/types";
import { listLeads } from "@/lib/leads/store";
import { listOpportunities } from "@/lib/opportunities/store";
import { canAccessIdeas } from "@/lib/ideas/access";
import { listIdeas, listRdItems } from "@/lib/ideas/store";
import { canAccessPmo } from "@/lib/pmo/access";
import {
  listPortfolioProjects,
  listPortfolioWorkspaces,
} from "@/lib/pmo/store";
import type { SessionUser } from "@/lib/auth/session";

function scopeByOwnerName<T extends { ownerName: string }>(
  items: T[],
  role: string,
  userName: string,
): T[] {
  if (role === "admin") return items;
  const needle = userName.trim().toLowerCase();
  return items.filter((item) => item.ownerName.toLowerCase() === needle);
}

export async function getDashboardSnapshot(
  session: SessionUser,
  filters: DashboardFilters = {},
): Promise<DashboardSnapshot | null> {
  if (!canSeeDashboard(session.role)) return null;

  const role = session.role === "admin" ? "admin" : "member";
  const pmoAvailable = canAccessPmo(session.role);
  const ideasAvailable = canAccessIdeas(session.role);
  const scope = {
    role: session.role,
    userId: session.id,
    userName: session.name,
  };

  const [
    allLeads,
    allAccounts,
    pipelineOpps,
    allOppsForLookup,
    projects,
    workspaces,
    ideas,
    rdItems,
  ] = await Promise.all([
    listLeads(),
    listAccounts(),
    listOpportunities({ scope: "pipeline" }),
    listOpportunities({ scope: "all" }),
    pmoAvailable ? listPortfolioProjects(scope) : Promise.resolve([]),
    pmoAvailable ? listPortfolioWorkspaces(scope) : Promise.resolve([]),
    ideasAvailable ? listIdeas(scope) : Promise.resolve([]),
    ideasAvailable ? listRdItems(scope) : Promise.resolve([]),
  ]);

  const leads = scopeByOwnerName(allLeads, session.role, session.name);
  const accounts = scopeByOwnerName(allAccounts, session.role, session.name);
  const opportunities = scopeByOwnerName(
    pipelineOpps,
    session.role,
    session.name,
  );

  const opportunityById = new Map(
    allOppsForLookup.map((o) => [o.id, o] as const),
  );

  return aggregateDashboard({
    role,
    filters,
    leads,
    accounts,
    projects,
    workspaces,
    opportunities,
    opportunityById,
    ideas,
    rdItems,
    pmoAvailable,
    ideasAvailable,
    fullFinance: canSeeFullFinance(session.role),
    pipelineFinance: canSeePipelineFinance(session.role),
  });
}
