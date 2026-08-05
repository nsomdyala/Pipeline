import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canAccessIdeas } from "@/lib/ideas/access";
import { isValidRdStage, listRdItems } from "@/lib/ideas/store";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!canAccessIdeas(session.role)) {
    return NextResponse.json(
      { error: "R&D is not available for this role." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const stageRaw = searchParams.get("stage") ?? "";
  const assignee = searchParams.get("assignee") ?? undefined;
  const overdue = searchParams.get("overdue") === "1";
  const atRisk = searchParams.get("atRisk") === "1";
  const stage = isValidRdStage(stageRaw) ? stageRaw : undefined;

  try {
    const items = await listRdItems(
      {
        role: session.role,
        userId: session.id,
        userName: session.name,
      },
      {
        stage: stage ?? "",
        assignee,
        overdue: overdue || undefined,
        atRisk: atRisk || undefined,
      },
    );
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/rd]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load R&D items. Check DATABASE_URL / migrations.",
      },
      { status: 500 },
    );
  }
}
