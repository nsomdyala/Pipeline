import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { listPortfolioProjects } from "@/lib/pmo/store";
import type {
  PmoProjectHealth,
  PmoProjectStatus,
} from "@/lib/pmo/types";
import { PMO_PROJECT_HEALTH, PMO_PROJECT_STATUSES } from "@/lib/pmo/types";

export async function GET(request: Request) {
  const auth = await requirePermission("pmo", "view");
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId") ?? undefined;
  const statusRaw = searchParams.get("status") ?? "";
  const healthRaw = searchParams.get("health") ?? "";
  const projectManager = searchParams.get("projectManager") ?? undefined;

  const status = PMO_PROJECT_STATUSES.includes(statusRaw as PmoProjectStatus)
    ? (statusRaw as PmoProjectStatus)
    : undefined;
  const health = PMO_PROJECT_HEALTH.includes(healthRaw as PmoProjectHealth)
    ? (healthRaw as PmoProjectHealth)
    : undefined;

  try {
    const projects = await listPortfolioProjects(
      {
        role: session.role,
        userId: session.id,
        userName: session.name,
      },
      {
        accountId,
        status: status ?? "",
        health: health ?? "",
        projectManager,
      },
    );
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[api/pmo/projects]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load PMO projects. Check DATABASE_URL / migrations.",
      },
      { status: 500 },
    );
  }
}
