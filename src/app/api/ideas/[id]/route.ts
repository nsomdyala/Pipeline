import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canAccessIdeas, canReviewIdea } from "@/lib/ideas/access";
import {
  addIdeaReview,
  decideIdea,
  getIdea,
} from "@/lib/ideas/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!canAccessIdeas(session.role)) {
    return NextResponse.json(
      { error: "Ideas are not available for this role." },
      { status: 403 },
    );
  }

  const { id } = await params;
  try {
    const idea = await getIdea(id, {
      role: session.role,
      userId: session.id,
      userName: session.name,
    });
    if (!idea) {
      return NextResponse.json({ error: "Idea not found." }, { status: 404 });
    }
    return NextResponse.json({ idea });
  } catch (err) {
    console.error("[api/ideas/:id]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load idea.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!canAccessIdeas(session.role)) {
    return NextResponse.json(
      { error: "Ideas are not available for this role." },
      { status: 403 },
    );
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = body as {
    action?: "review" | "decide";
    comment?: string;
    score?: number | null;
    decision?: "approve" | "reject" | "park" | "under_review";
    reason?: string;
    reviewerUserId?: string | null;
    reviewerName?: string;
  };

  const scope = {
    role: session.role,
    userId: session.id,
    userName: session.name,
  };

  try {
    if (input.action === "review") {
      const idea = await addIdeaReview(id, scope, {
        comment: input.comment,
        score: input.score,
      });
      return NextResponse.json({ idea });
    }

    if (input.action === "decide") {
      if (!canReviewIdea(session.role)) {
        return NextResponse.json(
          { error: "Only Admin/Director can approve or reject ideas." },
          { status: 403 },
        );
      }
      if (!input.decision) {
        return NextResponse.json(
          { error: "decision is required." },
          { status: 400 },
        );
      }
      const result = await decideIdea(id, scope, {
        decision: input.decision,
        reason: input.reason,
        reviewerUserId: input.reviewerUserId,
        reviewerName: input.reviewerName,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Unknown action. Use review or decide." },
      { status: 400 },
    );
  } catch (err) {
    console.error("[api/ideas/:id POST]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not update idea.",
      },
      { status: 400 },
    );
  }
}
