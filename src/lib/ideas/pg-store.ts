import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import {
  ideaAttachments as ideaAttachmentsTable,
  ideaReviews as ideaReviewsTable,
  ideas as ideasTable,
  rdActivity as rdActivityTable,
  rdAssignments as rdAssignmentsTable,
  rdDocuments as rdDocumentsTable,
  rdItems as rdItemsTable,
} from "@/db/schema";
import { createChannel } from "@/lib/chat/store";
import { seedIdeasBundle } from "@/lib/ideas/seed";
import type {
  CreateIdeaInput,
  Idea,
  IdeaAttachment,
  IdeaDecisionInput,
  IdeaFilters,
  IdeaReview,
  RdActivity,
  RdAssignment,
  RdDocument,
  RdFilters,
  RdItem,
  UpdateRdInput,
} from "@/lib/ideas/types";
import { RD_PRIORITIES, RD_STAGES } from "@/lib/ideas/types";

type SessionScope = {
  role: string;
  userId: string;
  userName: string;
};

function asIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  return value.toISOString();
}

function asIsoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return asIso(value);
}

function numOrNull(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}

function slugify(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 40);
}

async function ensureSeeded() {
  const existing = await db.select({ id: ideasTable.id }).from(ideasTable).limit(1);
  if (existing.length > 0) return;
  const seeded = seedIdeasBundle();
  for (const idea of seeded.ideas) {
    const channelId =
      (await ensureIdeaChannel(idea.id, idea.title)) ?? idea.channelId;
    await db.insert(ideasTable).values({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      problem: idea.problem,
      potentialValue: idea.potentialValue,
      potentialValueZar:
        idea.potentialValueZar == null ? null : String(idea.potentialValueZar),
      category: idea.category,
      status: idea.status,
      submitterUserId: idea.submitterUserId,
      submitterName: idea.submitterName,
      reviewerUserId: idea.reviewerUserId,
      reviewerName: idea.reviewerName,
      channelId,
      decisionReason: idea.decisionReason,
      decidedAt: idea.decidedAt ? new Date(idea.decidedAt) : null,
      decidedByUserId: idea.decidedByUserId,
      decidedByName: idea.decidedByName,
      rdItemId: idea.rdItemId,
      createdAt: new Date(idea.createdAt),
      updatedAt: new Date(idea.updatedAt),
    });
    for (const review of idea.reviews) {
      await db.insert(ideaReviewsTable).values({
        id: review.id,
        ideaId: review.ideaId,
        userId: review.userId,
        userName: review.userName,
        comment: review.comment,
        score: review.score,
        createdAt: new Date(review.createdAt),
        updatedAt: new Date(review.createdAt),
      });
    }
  }
  for (const item of seeded.rdItems) {
    await db.insert(rdItemsTable).values({
      id: item.id,
      ideaId: item.ideaId,
      title: item.title,
      stage: item.stage,
      ownerUserId: item.ownerUserId,
      ownerName: item.ownerName,
      priority: item.priority,
      targetDate: item.targetDate ? new Date(item.targetDate) : null,
      effortNotes: item.effortNotes,
      progressNotes: item.progressNotes,
      atRisk: item.atRisk,
      submitterName: item.submitterName,
      approvedByName: item.approvedByName,
      approvedAt: item.approvedAt ? new Date(item.approvedAt) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });
    for (const a of item.assignments) {
      await db.insert(rdAssignmentsTable).values({
        id: a.id,
        rdItemId: a.rdItemId,
        userId: a.userId,
        userName: a.userName,
      });
    }
    for (const act of item.activity) {
      await db.insert(rdActivityTable).values({
        id: act.id,
        rdItemId: act.rdItemId,
        authorUserId: act.authorUserId,
        authorName: act.authorName,
        body: act.body,
        createdAt: new Date(act.createdAt),
        updatedAt: new Date(act.createdAt),
      });
    }
  }
}

async function loadReviews(ideaId: string): Promise<IdeaReview[]> {
  const rows = await db
    .select()
    .from(ideaReviewsTable)
    .where(eq(ideaReviewsTable.ideaId, ideaId))
    .orderBy(asc(ideaReviewsTable.createdAt));
  return rows.map((r) => ({
    id: r.id,
    ideaId: r.ideaId,
    userId: r.userId,
    userName: r.userName,
    comment: r.comment,
    score: r.score,
    createdAt: asIso(r.createdAt),
  }));
}

async function loadAttachments(ideaId: string): Promise<IdeaAttachment[]> {
  const rows = await db
    .select()
    .from(ideaAttachmentsTable)
    .where(eq(ideaAttachmentsTable.ideaId, ideaId))
    .orderBy(asc(ideaAttachmentsTable.createdAt));
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    storedName: r.storedName,
    uploadedAt: asIso(r.createdAt),
  }));
}

async function toIdea(
  row: typeof ideasTable.$inferSelect,
): Promise<Idea> {
  const [reviews, attachments] = await Promise.all([
    loadReviews(row.id),
    loadAttachments(row.id),
  ]);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    problem: row.problem,
    potentialValue: row.potentialValue,
    potentialValueZar: numOrNull(row.potentialValueZar),
    category: row.category as Idea["category"],
    status: row.status as Idea["status"],
    submitterUserId: row.submitterUserId,
    submitterName: row.submitterName,
    reviewerUserId: row.reviewerUserId,
    reviewerName: row.reviewerName,
    channelId: row.channelId,
    decisionReason: row.decisionReason,
    decidedAt: asIsoOrNull(row.decidedAt),
    decidedByUserId: row.decidedByUserId,
    decidedByName: row.decidedByName,
    attachments,
    reviews,
    rdItemId: row.rdItemId,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

async function loadAssignments(rdItemId: string): Promise<RdAssignment[]> {
  const rows = await db
    .select()
    .from(rdAssignmentsTable)
    .where(eq(rdAssignmentsTable.rdItemId, rdItemId));
  return rows.map((r) => ({
    id: r.id,
    rdItemId: r.rdItemId,
    userId: r.userId,
    userName: r.userName,
  }));
}

async function loadActivity(rdItemId: string): Promise<RdActivity[]> {
  const rows = await db
    .select()
    .from(rdActivityTable)
    .where(eq(rdActivityTable.rdItemId, rdItemId))
    .orderBy(asc(rdActivityTable.createdAt));
  return rows.map((r) => ({
    id: r.id,
    rdItemId: r.rdItemId,
    authorUserId: r.authorUserId,
    authorName: r.authorName,
    body: r.body,
    createdAt: asIso(r.createdAt),
  }));
}

async function loadDocuments(rdItemId: string): Promise<RdDocument[]> {
  const rows = await db
    .select()
    .from(rdDocumentsTable)
    .where(eq(rdDocumentsTable.rdItemId, rdItemId))
    .orderBy(asc(rdDocumentsTable.createdAt));
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    storedName: r.storedName,
    uploadedAt: asIso(r.createdAt),
  }));
}

async function toRdItem(row: typeof rdItemsTable.$inferSelect): Promise<RdItem> {
  const [assignments, activity, documents] = await Promise.all([
    loadAssignments(row.id),
    loadActivity(row.id),
    loadDocuments(row.id),
  ]);
  return {
    id: row.id,
    ideaId: row.ideaId,
    title: row.title,
    stage: row.stage as RdItem["stage"],
    ownerUserId: row.ownerUserId,
    ownerName: row.ownerName,
    priority: row.priority as RdItem["priority"],
    targetDate: asIsoOrNull(row.targetDate),
    effortNotes: row.effortNotes,
    progressNotes: row.progressNotes,
    atRisk: Boolean(row.atRisk),
    assignments,
    documents,
    activity,
    submitterName: row.submitterName,
    approvedByName: row.approvedByName,
    approvedAt: asIsoOrNull(row.approvedAt),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

async function ensureIdeaChannel(ideaId: string, title: string): Promise<string | null> {
  try {
    const channel = await createChannel({
      name: `idea-${slugify(title) || ideaId.slice(0, 8)}`,
      description: `Discussion for idea: ${title}`,
      kind: "idea",
    });
    return channel.id;
  } catch {
    try {
      const channel = await createChannel({
        name: `idea-${ideaId.slice(0, 8)}`,
        description: `Discussion for idea: ${title}`,
        kind: "idea",
      });
      return channel.id;
    } catch {
      return null;
    }
  }
}

export async function pgListIdeas(filters: IdeaFilters = {}): Promise<Idea[]> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(ideasTable)
    .orderBy(desc(ideasTable.createdAt));
  const ideas = await Promise.all(rows.map((r) => toIdea(r)));
  return ideas.filter((idea) => {
    if (filters.status && idea.status !== filters.status) return false;
    if (filters.category && idea.category !== filters.category) return false;
    if (filters.submitter) {
      const needle = filters.submitter.trim().toLowerCase();
      if (!idea.submitterName.toLowerCase().includes(needle)) return false;
    }
    return true;
  });
}

export async function pgGetIdea(ideaId: string): Promise<Idea | null> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(ideasTable)
    .where(eq(ideasTable.id, ideaId))
    .limit(1);
  if (!rows[0]) return null;
  return toIdea(rows[0]);
}

export async function pgCreateIdea(
  scope: SessionScope,
  input: CreateIdeaInput,
): Promise<Idea> {
  await ensureSeeded();
  const id = randomUUID();
  const now = new Date();
  const channelId = await ensureIdeaChannel(id, input.title);
  await db.insert(ideasTable).values({
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    problem: input.problem.trim(),
    potentialValue: (input.potentialValue ?? "").trim(),
    potentialValueZar:
      input.potentialValueZar == null
        ? null
        : String(input.potentialValueZar),
    category: input.category,
    status: "submitted",
    submitterUserId: scope.userId,
    submitterName: scope.userName,
    channelId,
    createdAt: now,
    updatedAt: now,
  });
  const idea = await pgGetIdea(id);
  if (!idea) throw new Error("Failed to create idea.");
  return idea;
}

export async function pgAppendIdeaAttachments(
  ideaId: string,
  files: IdeaAttachment[],
): Promise<Idea | null> {
  for (const file of files) {
    await db.insert(ideaAttachmentsTable).values({
      id: file.id,
      ideaId,
      filename: file.filename,
      mime: file.mime,
      size: file.size,
      storedName: file.storedName,
      createdAt: new Date(file.uploadedAt),
      updatedAt: new Date(file.uploadedAt),
    });
  }
  await db
    .update(ideasTable)
    .set({ updatedAt: new Date() })
    .where(eq(ideasTable.id, ideaId));
  return pgGetIdea(ideaId);
}

export async function pgAddIdeaReview(
  ideaId: string,
  scope: SessionScope,
  input: { comment: string; score: number | null },
): Promise<Idea> {
  const idea = await pgGetIdea(ideaId);
  if (!idea) throw new Error("Idea not found.");
  const now = new Date();
  await db.insert(ideaReviewsTable).values({
    id: randomUUID(),
    ideaId,
    userId: scope.userId,
    userName: scope.userName,
    comment: input.comment,
    score: input.score,
    createdAt: now,
    updatedAt: now,
  });
  if (idea.status === "submitted") {
    await db
      .update(ideasTable)
      .set({ status: "under_review", updatedAt: now })
      .where(eq(ideasTable.id, ideaId));
  } else {
    await db
      .update(ideasTable)
      .set({ updatedAt: now })
      .where(eq(ideasTable.id, ideaId));
  }
  const updated = await pgGetIdea(ideaId);
  if (!updated) throw new Error("Idea not found.");
  return updated;
}

export async function pgDecideIdea(
  ideaId: string,
  scope: SessionScope,
  input: IdeaDecisionInput,
): Promise<{ idea: Idea; rdItem: RdItem | null }> {
  const idea = await pgGetIdea(ideaId);
  if (!idea) throw new Error("Idea not found.");
  const now = new Date();
  const reason = (input.reason ?? "").trim();

  if (input.decision === "under_review") {
    await db
      .update(ideasTable)
      .set({
        status: "under_review",
        reviewerUserId: input.reviewerUserId ?? scope.userId,
        reviewerName: input.reviewerName?.trim() || scope.userName,
        updatedAt: now,
      })
      .where(eq(ideasTable.id, ideaId));
    const updated = await pgGetIdea(ideaId);
    if (!updated) throw new Error("Idea not found.");
    return { idea: updated, rdItem: null };
  }

  if (input.decision === "reject" || input.decision === "park") {
    if (!reason) throw new Error("A reason is required to reject or park.");
    await db
      .update(ideasTable)
      .set({
        status: input.decision === "reject" ? "rejected" : "parked",
        decisionReason: reason,
        decidedAt: now,
        decidedByUserId: scope.userId,
        decidedByName: scope.userName,
        reviewerUserId: scope.userId,
        reviewerName: scope.userName,
        updatedAt: now,
      })
      .where(eq(ideasTable.id, ideaId));
    const updated = await pgGetIdea(ideaId);
    if (!updated) throw new Error("Idea not found.");
    return { idea: updated, rdItem: null };
  }

  const rdId = randomUUID();
  await db.insert(rdItemsTable).values({
    id: rdId,
    ideaId: idea.id,
    title: idea.title,
    stage: "backlog",
    ownerUserId: idea.submitterUserId,
    ownerName: idea.submitterName,
    priority: "medium",
    submitterName: idea.submitterName,
    approvedByName: scope.userName,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(rdAssignmentsTable).values({
    id: randomUUID(),
    rdItemId: rdId,
    userId: idea.submitterUserId,
    userName: idea.submitterName,
  });
  await db.insert(rdActivityTable).values({
    id: randomUUID(),
    rdItemId: rdId,
    authorUserId: scope.userId,
    authorName: scope.userName,
    body: reason
      ? `Approved and moved to R&D backlog. ${reason}`
      : "Approved and moved to R&D backlog.",
    createdAt: now,
    updatedAt: now,
  });
  await db
    .update(ideasTable)
    .set({
      status: "in_rd",
      decisionReason: reason,
      decidedAt: now,
      decidedByUserId: scope.userId,
      decidedByName: scope.userName,
      reviewerUserId: scope.userId,
      reviewerName: scope.userName,
      rdItemId: rdId,
      updatedAt: now,
    })
    .where(eq(ideasTable.id, ideaId));

  const updated = await pgGetIdea(ideaId);
  const rdItem = await pgGetRdItem(rdId);
  if (!updated || !rdItem) throw new Error("Failed to approve idea.");
  return { idea: updated, rdItem };
}

export async function pgListRdItems(filters: RdFilters = {}): Promise<RdItem[]> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(rdItemsTable)
    .orderBy(desc(rdItemsTable.updatedAt));
  const items = await Promise.all(rows.map((r) => toRdItem(r)));
  const today = new Date().toISOString().slice(0, 10);
  return items.filter((item) => {
    if (filters.stage && item.stage !== filters.stage) return false;
    if (filters.assignee) {
      const needle = filters.assignee.trim().toLowerCase();
      const onTeam =
        item.ownerName.toLowerCase().includes(needle) ||
        item.assignments.some((a) => a.userName.toLowerCase().includes(needle));
      if (!onTeam) return false;
    }
    const overdue =
      Boolean(item.targetDate) &&
      item.stage !== "completed" &&
      item.stage !== "shelved" &&
      (item.targetDate?.slice(0, 10) ?? "") < today;
    if (filters.overdue && !overdue) return false;
    if (filters.atRisk && !(item.atRisk || overdue)) return false;
    return true;
  });
}

export async function pgGetRdItem(rdItemId: string): Promise<RdItem | null> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(rdItemsTable)
    .where(eq(rdItemsTable.id, rdItemId))
    .limit(1);
  if (!rows[0]) return null;
  return toRdItem(rows[0]);
}

export async function pgUpdateRdItem(
  rdItemId: string,
  scope: SessionScope,
  input: UpdateRdInput,
): Promise<RdItem> {
  const item = await pgGetRdItem(rdItemId);
  if (!item) throw new Error("R&D item not found.");
  const now = new Date();

  if (input.stage && RD_STAGES.includes(input.stage) && input.stage !== item.stage) {
    await db.insert(rdActivityTable).values({
      id: randomUUID(),
      rdItemId,
      authorUserId: scope.userId,
      authorName: scope.userName,
      body: `Stage: ${item.stage} → ${input.stage}`,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (
    input.progressNotes != null &&
    input.progressNotes !== item.progressNotes
  ) {
    await db.insert(rdActivityTable).values({
      id: randomUUID(),
      rdItemId,
      authorUserId: scope.userId,
      authorName: scope.userName,
      body: `Progress update: ${input.progressNotes.trim() || "(cleared)"}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db
    .update(rdItemsTable)
    .set({
      stage:
        input.stage && RD_STAGES.includes(input.stage)
          ? input.stage
          : item.stage,
      ownerUserId:
        input.ownerUserId !== undefined ? input.ownerUserId : item.ownerUserId,
      ownerName:
        input.ownerName !== undefined ? input.ownerName : item.ownerName,
      priority:
        input.priority && RD_PRIORITIES.includes(input.priority)
          ? input.priority
          : item.priority,
      targetDate:
        input.targetDate !== undefined
          ? input.targetDate
            ? new Date(input.targetDate)
            : null
          : item.targetDate
            ? new Date(item.targetDate)
            : null,
      effortNotes:
        input.effortNotes !== undefined ? input.effortNotes : item.effortNotes,
      progressNotes:
        input.progressNotes !== undefined
          ? input.progressNotes
          : item.progressNotes,
      atRisk: input.atRisk !== undefined ? input.atRisk : item.atRisk,
      updatedAt: now,
    })
    .where(eq(rdItemsTable.id, rdItemId));

  if (input.assigneeUserIds) {
    await db
      .delete(rdAssignmentsTable)
      .where(eq(rdAssignmentsTable.rdItemId, rdItemId));
    for (const a of input.assigneeUserIds) {
      await db.insert(rdAssignmentsTable).values({
        id: randomUUID(),
        rdItemId,
        userId: a.userId,
        userName: a.userName,
      });
    }
  }

  const updated = await pgGetRdItem(rdItemId);
  if (!updated) throw new Error("R&D item not found.");
  return updated;
}

export async function pgAddRdActivity(
  rdItemId: string,
  scope: SessionScope,
  body: string,
): Promise<RdItem> {
  const item = await pgGetRdItem(rdItemId);
  if (!item) throw new Error("R&D item not found.");
  const now = new Date();
  await db.insert(rdActivityTable).values({
    id: randomUUID(),
    rdItemId,
    authorUserId: scope.userId,
    authorName: scope.userName,
    body,
    createdAt: now,
    updatedAt: now,
  });
  await db
    .update(rdItemsTable)
    .set({ updatedAt: now })
    .where(eq(rdItemsTable.id, rdItemId));
  const updated = await pgGetRdItem(rdItemId);
  if (!updated) throw new Error("R&D item not found.");
  return updated;
}

export async function pgAppendRdDocuments(
  rdItemId: string,
  scope: SessionScope,
  docs: RdDocument[],
): Promise<RdItem> {
  const item = await pgGetRdItem(rdItemId);
  if (!item) throw new Error("R&D item not found.");
  const now = new Date();
  for (const doc of docs) {
    await db.insert(rdDocumentsTable).values({
      id: doc.id,
      rdItemId,
      filename: doc.filename,
      mime: doc.mime,
      size: doc.size,
      storedName: doc.storedName,
      createdAt: new Date(doc.uploadedAt),
      updatedAt: new Date(doc.uploadedAt),
    });
  }
  await db.insert(rdActivityTable).values({
    id: randomUUID(),
    rdItemId,
    authorUserId: scope.userId,
    authorName: scope.userName,
    body: `Attached ${docs.length} document(s).`,
    createdAt: now,
    updatedAt: now,
  });
  await db
    .update(rdItemsTable)
    .set({ updatedAt: now })
    .where(eq(rdItemsTable.id, rdItemId));
  const updated = await pgGetRdItem(rdItemId);
  if (!updated) throw new Error("R&D item not found.");
  return updated;
}
