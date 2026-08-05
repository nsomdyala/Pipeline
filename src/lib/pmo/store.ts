import "server-only";

import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import {
  canSeeAllPmoProjects,
  canAccessPmo,
} from "@/lib/pmo/access";
import { seedDemoWorkspace } from "@/lib/pmo/seed";
import type {
  PmoPortfolioFilters,
  PmoProject,
  PmoProjectWorkspace,
} from "@/lib/pmo/types";

const WORKSPACES_FILE = "pmo-workspaces.json";

function usePostgres() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

type SessionScope = {
  role: string;
  userId: string;
  userName: string;
};

async function ensureJsonWorkspaces(): Promise<PmoProjectWorkspace[]> {
  const existing = await readJsonFile<PmoProjectWorkspace[]>(WORKSPACES_FILE, []);
  if (existing.length > 0) return existing;
  const seeded = [seedDemoWorkspace()];
  await writeJsonFile(WORKSPACES_FILE, seeded);
  return seeded;
}

function filterProjects(
  projects: PmoProject[],
  filters: PmoPortfolioFilters = {},
): PmoProject[] {
  return projects.filter((project) => {
    if (filters.accountId && project.accountId !== filters.accountId) {
      return false;
    }
    if (filters.status && project.status !== filters.status) return false;
    if (filters.health && project.health !== filters.health) return false;
    if (filters.projectManager) {
      const needle = filters.projectManager.trim().toLowerCase();
      if (!project.projectManagerName.toLowerCase().includes(needle)) {
        return false;
      }
    }
    return true;
  });
}

function memberCanSee(project: PmoProject, scope: SessionScope): boolean {
  if (project.projectManagerUserId === scope.userId) return true;
  if (project.projectManagerName === scope.userName) return true;
  return project.assignments.some(
    (a) => a.userId === scope.userId || a.userName === scope.userName,
  );
}

function scopeProjects(
  projects: PmoProject[],
  scope: SessionScope,
): PmoProject[] {
  if (!canAccessPmo(scope.role)) return [];
  if (canSeeAllPmoProjects(scope.role)) return projects;
  return projects.filter((p) => memberCanSee(p, scope));
}

export async function listPortfolioProjects(
  scope: SessionScope,
  filters: PmoPortfolioFilters = {},
): Promise<PmoProject[]> {
  if (usePostgres()) {
    const { pgListProjects } = await import("@/lib/pmo/pg-store");
    const projects = await pgListProjects({ filters, assignedUserId: null });
    return filterProjects(scopeProjects(projects, scope), filters);
  }

  const workspaces = await ensureJsonWorkspaces();
  const projects = workspaces.map((w) => w.project);
  return filterProjects(scopeProjects(projects, scope), filters).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export async function listAccountProjects(
  accountId: string,
  scope: SessionScope,
): Promise<PmoProject[]> {
  return listPortfolioProjects(scope, { accountId });
}

export async function getProjectWorkspace(
  projectId: string,
  scope: SessionScope,
): Promise<PmoProjectWorkspace | null> {
  if (!canAccessPmo(scope.role)) return null;

  if (usePostgres()) {
    const { pgGetWorkspace } = await import("@/lib/pmo/pg-store");
    const workspace = await pgGetWorkspace(projectId);
    if (!workspace) return null;
    if (
      canSeeAllPmoProjects(scope.role) ||
      memberCanSee(workspace.project, scope)
    ) {
      return workspace;
    }
    return null;
  }

  const workspaces = await ensureJsonWorkspaces();
  const workspace = workspaces.find((w) => w.project.id === projectId) ?? null;
  if (!workspace) return null;
  if (
    canSeeAllPmoProjects(scope.role) ||
    memberCanSee(workspace.project, scope)
  ) {
    return workspace;
  }
  return null;
}

export async function userCanOpenProject(
  projectId: string,
  scope: SessionScope,
): Promise<boolean> {
  const workspace = await getProjectWorkspace(projectId, scope);
  return workspace != null;
}

/** Scoped workspaces for portfolio rollups (PO / charter reads). */
export async function listPortfolioWorkspaces(
  scope: SessionScope,
): Promise<PmoProjectWorkspace[]> {
  if (!canAccessPmo(scope.role)) return [];

  if (usePostgres()) {
    const projects = await listPortfolioProjects(scope);
    const workspaces = await Promise.all(
      projects.map((p) => getProjectWorkspace(p.id, scope)),
    );
    return workspaces.filter((w): w is PmoProjectWorkspace => w != null);
  }

  const workspaces = await ensureJsonWorkspaces();
  const allowed = new Set(
    (await listPortfolioProjects(scope)).map((p) => p.id),
  );
  return workspaces.filter((w) => allowed.has(w.project.id));
}
