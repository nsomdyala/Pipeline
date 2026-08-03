import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  posts as postsTable,
  topics as topicsTable,
} from "@/db/schema";
import {
  TOPIC_CATEGORIES,
  type DiscussionPost,
  type DiscussionTopic,
  type TopicCategory,
} from "@/lib/discussions/types";

type TopicRow = typeof topicsTable.$inferSelect;
type PostRow = typeof postsTable.$inferSelect;

function asIso(value: Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toISOString();
}

function asCategory(value: string): TopicCategory {
  return TOPIC_CATEGORIES.includes(value as TopicCategory)
    ? (value as TopicCategory)
    : "Admin";
}

function toPost(row: PostRow): DiscussionPost {
  return {
    id: row.id,
    authorName: row.authorName || "Pipeline",
    body: row.body,
    createdAt: asIso(row.createdAt),
  };
}

function toTopic(row: TopicRow, posts: DiscussionPost[]): DiscussionTopic {
  return {
    id: row.id,
    title: row.title,
    category: asCategory(row.category),
    body: row.body,
    linkedTo: row.linkedTo ?? "",
    pinned: Boolean(row.pinned),
    solved: Boolean(row.solved),
    authorName: row.authorName || "Pipeline",
    posts,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

async function loadPostsByTopicIds(
  topicIds: string[],
): Promise<Map<string, DiscussionPost[]>> {
  const map = new Map<string, DiscussionPost[]>();
  if (topicIds.length === 0) return map;

  const rows = await db
    .select()
    .from(postsTable)
    .where(inArray(postsTable.topicId, topicIds))
    .orderBy(asc(postsTable.createdAt));

  for (const row of rows) {
    const list = map.get(row.topicId) ?? [];
    list.push(toPost(row));
    map.set(row.topicId, list);
  }
  return map;
}

export async function pgListTopics(): Promise<DiscussionTopic[]> {
  const rows = await db
    .select()
    .from(topicsTable)
    .orderBy(desc(topicsTable.pinned), desc(topicsTable.updatedAt));

  const postsByTopic = await loadPostsByTopicIds(rows.map((row) => row.id));
  return rows.map((row) => toTopic(row, postsByTopic.get(row.id) ?? []));
}

export async function pgCreateTopic(input: {
  title: string;
  category: TopicCategory;
  body: string;
  linkedTo?: string;
  authorName?: string;
}): Promise<DiscussionTopic> {
  const now = new Date();
  const [row] = await db
    .insert(topicsTable)
    .values({
      title: input.title.trim(),
      category: input.category,
      body: input.body.trim(),
      linkedTo: input.linkedTo?.trim() ?? "",
      pinned: false,
      solved: false,
      authorName: input.authorName?.trim() || "Pipeline",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toTopic(row, []);
}

export async function pgAddReply(
  topicId: string,
  body: string,
  authorName?: string,
): Promise<DiscussionTopic | null> {
  const [topic] = await db
    .select()
    .from(topicsTable)
    .where(eq(topicsTable.id, topicId))
    .limit(1);
  if (!topic) return null;

  const now = new Date();
  await db.insert(postsTable).values({
    topicId,
    authorName: authorName?.trim() || "Pipeline",
    body: body.trim(),
    createdAt: now,
  });

  await db
    .update(topicsTable)
    .set({ updatedAt: now })
    .where(eq(topicsTable.id, topicId));

  const postsByTopic = await loadPostsByTopicIds([topicId]);
  return toTopic(
    { ...topic, updatedAt: now },
    postsByTopic.get(topicId) ?? [],
  );
}
