import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canAccessIdeas, canManageRd } from "@/lib/ideas/access";
import {
  addRdActivity,
  addRdDocuments,
  getRdItem,
  updateRdItem,
} from "@/lib/ideas/store";
import {
  RD_PRIORITIES,
  RD_STAGES,
  type RdPriority,
  type RdStage,
} from "@/lib/ideas/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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

  const { id } = await params;
  try {
    const item = await getRdItem(id, {
      role: session.role,
      userId: session.id,
      userName: session.name,
    });
    if (!item) {
      return NextResponse.json({ error: "R&D item not found." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[api/rd/:id]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load R&D item.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!canManageRd(session.role)) {
    return NextResponse.json(
      { error: "You do not have permission to update R&D items." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    const scope = {
      role: session.role,
      userId: session.id,
      userName: session.name,
    };

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const uploads = form
        .getAll("files")
        .filter((f): f is File => f instanceof File && f.size > 0);
      if (uploads.length === 0) {
        return NextResponse.json(
          { error: "No files uploaded." },
          { status: 400 },
        );
      }
      const item = await addRdDocuments(id, scope, uploads);
      return NextResponse.json({ item });
    }

    const body = (await request.json()) as {
      action?: "update" | "activity";
      stage?: string;
      ownerUserId?: string | null;
      ownerName?: string;
      priority?: string;
      targetDate?: string | null;
      effortNotes?: string;
      progressNotes?: string;
      atRisk?: boolean;
      assigneeUserIds?: Array<{ userId: string; userName: string }>;
      body?: string;
    };

    if (body.action === "activity") {
      const item = await addRdActivity(id, scope, body.body ?? "");
      return NextResponse.json({ item });
    }

    const stage = RD_STAGES.includes(body.stage as RdStage)
      ? (body.stage as RdStage)
      : undefined;
    const priority = RD_PRIORITIES.includes(body.priority as RdPriority)
      ? (body.priority as RdPriority)
      : undefined;

    const item = await updateRdItem(id, scope, {
      stage,
      ownerUserId: body.ownerUserId,
      ownerName: body.ownerName,
      priority,
      targetDate: body.targetDate,
      effortNotes: body.effortNotes,
      progressNotes: body.progressNotes,
      atRisk: body.atRisk,
      assigneeUserIds: body.assigneeUserIds,
    });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[api/rd/:id PATCH]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not update R&D item.",
      },
      { status: 400 },
    );
  }
}
