import "server-only";

import { randomUUID } from "node:crypto";
import { createChannel } from "@/lib/chat/store";
import { persistIdeaAttachments, persistRdDocuments } from "@/lib/ideas/files";
import {
  canAccessIdeas,
  canManageRd,
  canReviewIdea,
  canSubmitIdea,
} from "@/lib/ideas/access";
import { seedIdeasBundle } from "@/lib/ideas/seed";
import type {
  CreateIdeaInput,
  Idea,
  IdeaAttachment,
  IdeaDecisionInput,
  IdeaFilters,
  IdeaReviewInput,
  RdFilters,
  RdItem,
  UpdateRdInput,
} from "@/lib/ideas/types";
import {
  IDEA_CATEGORIES,
  IDEA_STATUSES,
  RD_PRIORITIES,
  RD_STAGES,
} from "@/lib/ideas/types";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";

const IDEAS_FILE = "ideas.json";
const RD_FILE = "rd-items.json";

function usePostgres() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

type SessionScope = {
  role: string;
  userId: string;
  userName: string;
};

type Bundle = { ideas: Idea[]; rdItems: RdItem[] };

async function ensureJsonBundle(): Promise<Bundle> {
  const ideas = await readJsonFile<Idea[]>(IDEAS_FILE, []);
  const rdItems = await readJsonFile<RdItem[]>(RD_FILE, []);
  if (ideas.length > 0 || rdItems.length > 0) {
    return { ideas, rdItems };
  }
  const seeded = seedIdeasBundle();
  // Create chat channels first so we can store real ids on seeded ideas
  const withChannels: Idea[] = [];
  for (const idea of seeded.ideas) {
    const channelId = await ensureIdeaChannel({ ...idea, channelId: null });
    withChannels.push({ ...idea, channelId });
  }
  await writeJsonFile(IDEAS_FILE, withChannels);
  await writeJsonFile(RD_FILE, seeded.rdItems);
  return { ideas: withChannels, rdItems: seeded.rdItems };
}

async function saveJsonBundle(bundle: Bundle) {
  await writeJsonFile(IDEAS_FILE, bundle.ideas);
  await writeJsonFile(RD_FILE, bundle.rdItems);
}

function filterIdeas(ideas: Idea[], filters: IdeaFilters = {}): Idea[] {
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

function isRdOverdue(item: RdItem, todayYmd: string): boolean {
  if (!item.targetDate) return false;
  if (item.stage === "completed" || item.stage === "shelved") return false;
  const ymd = item.targetDate.slice(0, 10);
  return ymd < todayYmd;
}

function filterRd(items: RdItem[], filters: RdFilters = {}): RdItem[] {
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
    if (filters.overdue && !isRdOverdue(item, today)) return false;
    if (filters.atRisk && !(item.atRisk || isRdOverdue(item, today))) {
      return false;
    }
    return true;
  });
}

function slugify(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 40);
}

async function ensureIdeaChannel(idea: Idea): Promise<string | null> {
  if (idea.channelId) return idea.channelId;
  try {
    const channel = await createChannel({
      name: `idea-${slugify(idea.title) || idea.id.slice(0, 8)}`,
      description: `Discussion for idea: ${idea.title}`,
      kind: "idea",
    });
    return channel.id;
  } catch {
    // Channel name collision — retry with id suffix
    try {
      const channel = await createChannel({
        name: `idea-${idea.id.slice(0, 8)}`,
        description: `Discussion for idea: ${idea.title}`,
        kind: "idea",
      });
      return channel.id;
    } catch {
      return null;
    }
  }
}

export async function listIdeas(
  scope: SessionScope,
  filters: IdeaFilters = {},
): Promise<Idea[]> {
  if (!canAccessIdeas(scope.role)) return [];

  if (usePostgres()) {
    const { pgListIdeas } = await import("@/lib/ideas/pg-store");
    return pgListIdeas(filters);
  }

  const bundle = await ensureJsonBundle();
  return filterIdeas(bundle.ideas, filters).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getIdea(
  ideaId: string,
  scope: SessionScope,
): Promise<Idea | null> {
  if (!canAccessIdeas(scope.role)) return null;

  if (usePostgres()) {
    const { pgGetIdea } = await import("@/lib/ideas/pg-store");
    return pgGetIdea(ideaId);
  }

  const bundle = await ensureJsonBundle();
  return bundle.ideas.find((i) => i.id === ideaId) ?? null;
}

export async function createIdea(
  scope: SessionScope,
  input: CreateIdeaInput,
  uploads: File[] = [],
): Promise<Idea> {
  if (!canSubmitIdea(scope.role)) {
    throw new Error("You do not have permission to submit ideas.");
  }

  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");
  if (!IDEA_CATEGORIES.includes(input.category as (typeof IDEA_CATEGORIES)[number])) {
    throw new Error("Invalid category.");
  }

  if (usePostgres()) {
    const { pgCreateIdea } = await import("@/lib/ideas/pg-store");
    const idea = await pgCreateIdea(scope, input);
    if (uploads.length > 0) {
      const files = await persistIdeaAttachments(idea.id, uploads);
      return (await attachIdeaFiles(scope, idea.id, files)) ?? idea;
    }
    return idea;
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const attachments = await persistIdeaAttachments(id, uploads);
  let idea: Idea = {
    id,
    title,
    description: input.description.trim(),
    problem: input.problem.trim(),
    potentialValue: (input.potentialValue ?? "").trim(),
    potentialValueZar:
      input.potentialValueZar == null || Number.isNaN(input.potentialValueZar)
        ? null
        : input.potentialValueZar,
    category: input.category,
    status: "submitted",
    submitterUserId: scope.userId,
    submitterName: scope.userName,
    reviewerUserId: null,
    reviewerName: "",
    channelId: null,
    decisionReason: "",
    decidedAt: null,
    decidedByUserId: null,
    decidedByName: "",
    attachments,
    reviews: [],
    rdItemId: null,
    createdAt: now,
    updatedAt: now,
  };

  const channelId = await ensureIdeaChannel(idea);
  idea = { ...idea, channelId, updatedAt: new Date().toISOString() };

  const bundle = await ensureJsonBundle();
  bundle.ideas.unshift(idea);
  await saveJsonBundle(bundle);
  return idea;
}

async function attachIdeaFiles(
  scope: SessionScope,
  ideaId: string,
  files: IdeaAttachment[],
): Promise<Idea | null> {
  if (usePostgres()) {
    const { pgAppendIdeaAttachments } = await import("@/lib/ideas/pg-store");
    return pgAppendIdeaAttachments(ideaId, files);
  }
  const bundle = await ensureJsonBundle();
  const idx = bundle.ideas.findIndex((i) => i.id === ideaId);
  if (idx < 0) return null;
  bundle.ideas[idx] = {
    ...bundle.ideas[idx],
    attachments: [...bundle.ideas[idx].attachments, ...files],
    updatedAt: new Date().toISOString(),
  };
  await saveJsonBundle(bundle);
  return bundle.ideas[idx];
}

export async function addIdeaReview(
  ideaId: string,
  scope: SessionScope,
  input: IdeaReviewInput,
): Promise<Idea> {
  if (!canAccessIdeas(scope.role)) {
    throw new Error("Ideas are not available for this role.");
  }

  const comment = (input.comment ?? "").trim();
  const score =
    input.score == null || Number.isNaN(input.score)
      ? null
      : Math.min(5, Math.max(1, Math.round(input.score)));
  if (!comment && score == null) {
    throw new Error("Add a comment or score.");
  }

  if (usePostgres()) {
    const { pgAddIdeaReview } = await import("@/lib/ideas/pg-store");
    return pgAddIdeaReview(ideaId, scope, { comment, score });
  }

  const bundle = await ensureJsonBundle();
  const idx = bundle.ideas.findIndex((i) => i.id === ideaId);
  if (idx < 0) throw new Error("Idea not found.");
  const idea = bundle.ideas[idx];
  const review = {
    id: randomUUID(),
    ideaId,
    userId: scope.userId,
    userName: scope.userName,
    comment,
    score,
    createdAt: new Date().toISOString(),
  };
  let status = idea.status;
  if (status === "submitted") status = "under_review";
  bundle.ideas[idx] = {
    ...idea,
    status,
    reviews: [...idea.reviews, review],
    updatedAt: new Date().toISOString(),
  };
  await saveJsonBundle(bundle);
  return bundle.ideas[idx];
}

export async function decideIdea(
  ideaId: string,
  scope: SessionScope,
  input: IdeaDecisionInput,
): Promise<{ idea: Idea; rdItem: RdItem | null }> {
  if (!canReviewIdea(scope.role)) {
    throw new Error("Only Admin/Director can approve or reject ideas.");
  }

  if (usePostgres()) {
    const { pgDecideIdea } = await import("@/lib/ideas/pg-store");
    return pgDecideIdea(ideaId, scope, input);
  }

  const bundle = await ensureJsonBundle();
  const idx = bundle.ideas.findIndex((i) => i.id === ideaId);
  if (idx < 0) throw new Error("Idea not found.");
  const idea = bundle.ideas[idx];
  const now = new Date().toISOString();
  const reason = (input.reason ?? "").trim();

  if (input.decision === "under_review") {
    bundle.ideas[idx] = {
      ...idea,
      status: "under_review",
      reviewerUserId: input.reviewerUserId ?? scope.userId,
      reviewerName: input.reviewerName?.trim() || scope.userName,
      updatedAt: now,
    };
    await saveJsonBundle(bundle);
    return { idea: bundle.ideas[idx], rdItem: null };
  }

  if (input.decision === "reject" || input.decision === "park") {
    if (!reason) throw new Error("A reason is required to reject or park.");
    bundle.ideas[idx] = {
      ...idea,
      status: input.decision === "reject" ? "rejected" : "parked",
      decisionReason: reason,
      decidedAt: now,
      decidedByUserId: scope.userId,
      decidedByName: scope.userName,
      reviewerUserId: scope.userId,
      reviewerName: scope.userName,
      updatedAt: now,
    };
    await saveJsonBundle(bundle);
    return { idea: bundle.ideas[idx], rdItem: null };
  }

  // approve → create R&D item
  const rdId = randomUUID();
  const rdItem: RdItem = {
    id: rdId,
    ideaId: idea.id,
    title: idea.title,
    stage: "backlog",
    ownerUserId: idea.submitterUserId,
    ownerName: idea.submitterName,
    priority: "medium",
    targetDate: null,
    effortNotes: "",
    progressNotes: "",
    atRisk: false,
    assignments: [
      {
        id: randomUUID(),
        rdItemId: rdId,
        userId: idea.submitterUserId,
        userName: idea.submitterName,
      },
    ],
    documents: [],
    activity: [
      {
        id: randomUUID(),
        rdItemId: rdId,
        authorUserId: scope.userId,
        authorName: scope.userName,
        body: reason
          ? `Approved and moved to R&D backlog. ${reason}`
          : "Approved and moved to R&D backlog.",
        createdAt: now,
      },
    ],
    submitterName: idea.submitterName,
    approvedByName: scope.userName,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  bundle.ideas[idx] = {
    ...idea,
    status: "in_rd",
    decisionReason: reason,
    decidedAt: now,
    decidedByUserId: scope.userId,
    decidedByName: scope.userName,
    reviewerUserId: scope.userId,
    reviewerName: scope.userName,
    rdItemId: rdId,
    updatedAt: now,
  };
  bundle.rdItems.unshift(rdItem);
  await saveJsonBundle(bundle);
  return { idea: bundle.ideas[idx], rdItem };
}

export async function listRdItems(
  scope: SessionScope,
  filters: RdFilters = {},
): Promise<RdItem[]> {
  if (!canAccessIdeas(scope.role)) return [];

  if (usePostgres()) {
    const { pgListRdItems } = await import("@/lib/ideas/pg-store");
    return pgListRdItems(filters);
  }

  const bundle = await ensureJsonBundle();
  return filterRd(bundle.rdItems, filters).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getRdItem(
  rdItemId: string,
  scope: SessionScope,
): Promise<RdItem | null> {
  if (!canAccessIdeas(scope.role)) return null;

  if (usePostgres()) {
    const { pgGetRdItem } = await import("@/lib/ideas/pg-store");
    return pgGetRdItem(rdItemId);
  }

  const bundle = await ensureJsonBundle();
  return bundle.rdItems.find((i) => i.id === rdItemId) ?? null;
}

export async function updateRdItem(
  rdItemId: string,
  scope: SessionScope,
  input: UpdateRdInput,
): Promise<RdItem> {
  if (!canManageRd(scope.role)) {
    throw new Error("You do not have permission to update R&D items.");
  }

  if (usePostgres()) {
    const { pgUpdateRdItem } = await import("@/lib/ideas/pg-store");
    return pgUpdateRdItem(rdItemId, scope, input);
  }

  const bundle = await ensureJsonBundle();
  const idx = bundle.rdItems.findIndex((i) => i.id === rdItemId);
  if (idx < 0) throw new Error("R&D item not found.");
  const item = bundle.rdItems[idx];
  const now = new Date().toISOString();
  const activity = [...item.activity];

  if (input.stage && RD_STAGES.includes(input.stage) && input.stage !== item.stage) {
    activity.push({
      id: randomUUID(),
      rdItemId,
      authorUserId: scope.userId,
      authorName: scope.userName,
      body: `Stage: ${item.stage} → ${input.stage}`,
      createdAt: now,
    });
  }
  if (input.progressNotes != null && input.progressNotes !== item.progressNotes) {
    activity.push({
      id: randomUUID(),
      rdItemId,
      authorUserId: scope.userId,
      authorName: scope.userName,
      body: `Progress update: ${input.progressNotes.trim() || "(cleared)"}`,
      createdAt: now,
    });
  }

  let assignments = item.assignments;
  if (input.assigneeUserIds) {
    assignments = input.assigneeUserIds.map((a) => ({
      id: randomUUID(),
      rdItemId,
      userId: a.userId,
      userName: a.userName,
    }));
  }

  bundle.rdItems[idx] = {
    ...item,
    stage:
      input.stage && RD_STAGES.includes(input.stage) ? input.stage : item.stage,
    ownerUserId:
      input.ownerUserId !== undefined ? input.ownerUserId : item.ownerUserId,
    ownerName:
      input.ownerName !== undefined ? input.ownerName : item.ownerName,
    priority:
      input.priority && RD_PRIORITIES.includes(input.priority)
        ? input.priority
        : item.priority,
    targetDate:
      input.targetDate !== undefined ? input.targetDate : item.targetDate,
    effortNotes:
      input.effortNotes !== undefined
        ? input.effortNotes
        : item.effortNotes,
    progressNotes:
      input.progressNotes !== undefined
        ? input.progressNotes
        : item.progressNotes,
    atRisk: input.atRisk !== undefined ? input.atRisk : item.atRisk,
    assignments,
    activity,
    updatedAt: now,
  };
  await saveJsonBundle(bundle);
  return bundle.rdItems[idx];
}

export async function addRdActivity(
  rdItemId: string,
  scope: SessionScope,
  body: string,
): Promise<RdItem> {
  if (!canManageRd(scope.role)) {
    throw new Error("You do not have permission to update R&D items.");
  }
  const text = body.trim();
  if (!text) throw new Error("Activity note is required.");

  if (usePostgres()) {
    const { pgAddRdActivity } = await import("@/lib/ideas/pg-store");
    return pgAddRdActivity(rdItemId, scope, text);
  }

  const bundle = await ensureJsonBundle();
  const idx = bundle.rdItems.findIndex((i) => i.id === rdItemId);
  if (idx < 0) throw new Error("R&D item not found.");
  const now = new Date().toISOString();
  bundle.rdItems[idx] = {
    ...bundle.rdItems[idx],
    activity: [
      ...bundle.rdItems[idx].activity,
      {
        id: randomUUID(),
        rdItemId,
        authorUserId: scope.userId,
        authorName: scope.userName,
        body: text,
        createdAt: now,
      },
    ],
    updatedAt: now,
  };
  await saveJsonBundle(bundle);
  return bundle.rdItems[idx];
}

export async function addRdDocuments(
  rdItemId: string,
  scope: SessionScope,
  uploads: File[],
): Promise<RdItem> {
  if (!canManageRd(scope.role)) {
    throw new Error("You do not have permission to update R&D items.");
  }
  const docs = await persistRdDocuments(rdItemId, uploads);

  if (usePostgres()) {
    const { pgAppendRdDocuments } = await import("@/lib/ideas/pg-store");
    return pgAppendRdDocuments(rdItemId, scope, docs);
  }

  const bundle = await ensureJsonBundle();
  const idx = bundle.rdItems.findIndex((i) => i.id === rdItemId);
  if (idx < 0) throw new Error("R&D item not found.");
  const now = new Date().toISOString();
  bundle.rdItems[idx] = {
    ...bundle.rdItems[idx],
    documents: [...bundle.rdItems[idx].documents, ...docs],
    activity: [
      ...bundle.rdItems[idx].activity,
      {
        id: randomUUID(),
        rdItemId,
        authorUserId: scope.userId,
        authorName: scope.userName,
        body: `Attached ${docs.length} document(s).`,
        createdAt: now,
      },
    ],
    updatedAt: now,
  };
  await saveJsonBundle(bundle);
  return bundle.rdItems[idx];
}

export function isValidIdeaStatus(value: string): value is Idea["status"] {
  return IDEA_STATUSES.includes(value as Idea["status"]);
}

export function isValidRdStage(value: string): value is RdItem["stage"] {
  return RD_STAGES.includes(value as RdItem["stage"]);
}
