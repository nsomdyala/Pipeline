import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { listAccountProjects } from "@/lib/pmo/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requirePermission("pmo", "view");
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { id: accountId } = await params;

  try {
    const projects = await listAccountProjects(accountId, {
      role: session.role,
      userId: session.id,
      userName: session.name,
    });
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[api/accounts/:id/pmo]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load account PMO projects.",
      },
      { status: 500 },
    );
  }
}
