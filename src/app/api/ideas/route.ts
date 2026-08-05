import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { canSubmitIdea } from "@/lib/ideas/access";
import { createIdea, isValidIdeaStatus, listIdeas } from "@/lib/ideas/store";
import { IDEA_CATEGORIES, type IdeaCategory } from "@/lib/ideas/types";

export async function GET(request: Request) {
  const auth = await requirePermission("ideas", "view");
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const submitter = searchParams.get("submitter") ?? undefined;
  const status = isValidIdeaStatus(statusRaw) ? statusRaw : undefined;

  try {
    const ideas = await listIdeas(
      {
        role: session.role,
        userId: session.id,
        userName: session.name,
      },
      { status: status ?? "", category, submitter },
    );
    return NextResponse.json({ ideas });
  } catch (err) {
    console.error("[api/ideas]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load ideas. Check DATABASE_URL / migrations.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("ideas", "create");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  if (!canSubmitIdea(session.role)) {
    return NextResponse.json(
      { error: "You do not have permission to submit ideas." },
      { status: 403 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let title = "";
    let description = "";
    let problem = "";
    let potentialValue = "";
    let potentialValueZar: number | null = null;
    let category: IdeaCategory = "Other";
    let uploads: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      title = String(form.get("title") ?? "");
      description = String(form.get("description") ?? "");
      problem = String(form.get("problem") ?? "");
      potentialValue = String(form.get("potentialValue") ?? "");
      const zarRaw = String(form.get("potentialValueZar") ?? "").trim();
      potentialValueZar = zarRaw ? Number(zarRaw) : null;
      category = String(form.get("category") ?? "Other") as IdeaCategory;
      uploads = form
        .getAll("files")
        .filter((f): f is File => f instanceof File && f.size > 0);
    } else {
      const body = (await request.json()) as {
        title?: string;
        description?: string;
        problem?: string;
        potentialValue?: string;
        potentialValueZar?: number | null;
        category?: string;
      };
      title = body.title ?? "";
      description = body.description ?? "";
      problem = body.problem ?? "";
      potentialValue = body.potentialValue ?? "";
      potentialValueZar = body.potentialValueZar ?? null;
      category = (body.category ?? "Other") as IdeaCategory;
    }

    if (
      !IDEA_CATEGORIES.includes(category as (typeof IDEA_CATEGORIES)[number])
    ) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    const idea = await createIdea(
      {
        role: session.role,
        userId: session.id,
        userName: session.name,
      },
      {
        title,
        description,
        problem,
        potentialValue,
        potentialValueZar,
        category,
      },
      uploads,
    );
    return NextResponse.json({ idea }, { status: 201 });
  } catch (err) {
    console.error("[api/ideas POST]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create idea.",
      },
      { status: 400 },
    );
  }
}
