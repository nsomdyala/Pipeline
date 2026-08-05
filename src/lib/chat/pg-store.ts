import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  channels as channelsTable,
  messages as messagesTable,
} from "@/db/schema";
import type {
  Channel,
  ChannelKind,
  ChatMessage,
  CreateChannelInput,
  CreateMessageInput,
} from "@/lib/chat/types";

const CHANNEL_KINDS = ["public", "dm", "opportunity", "idea"] as const;

const DEFAULT_CHANNELS: Array<{
  name: string;
  kind: ChannelKind;
  description: string;
}> = [
  {
    name: "general",
    kind: "public",
    description: "Team-wide updates and day-to-day chat.",
  },
  {
    name: "opportunities",
    kind: "public",
    description: "New matches, bid/no-bid calls and closing alerts.",
  },
  {
    name: "compliance-alerts",
    kind: "public",
    description: "Expiry reminders and vault status.",
  },
];

type ChannelRow = typeof channelsTable.$inferSelect;
type MessageRow = typeof messagesTable.$inferSelect;

function asIso(value: Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toISOString();
}

function toChannel(row: ChannelRow): Channel {
  const kind = CHANNEL_KINDS.includes(row.kind as ChannelKind)
    ? (row.kind as ChannelKind)
    : "public";
  return {
    id: row.id,
    name: row.name,
    kind,
    description: row.description ?? "",
    createdAt: asIso(row.createdAt),
  };
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    channelId: row.channelId,
    authorName: row.authorName || "Pipeline",
    body: row.body,
    createdAt: asIso(row.createdAt),
  };
}

async function ensureDefaultChannels(): Promise<Channel[]> {
  const existing = await db
    .select()
    .from(channelsTable)
    .orderBy(asc(channelsTable.name));

  const byName = new Map(existing.map((row) => [row.name, row]));
  const missing = DEFAULT_CHANNELS.filter((ch) => !byName.has(ch.name));

  if (missing.length > 0) {
    const inserted = await db
      .insert(channelsTable)
      .values(
        missing.map((ch) => ({
          name: ch.name,
          kind: ch.kind,
          description: ch.description,
        })),
      )
      .returning();
    for (const row of inserted) byName.set(row.name, row);
  }

  // First-time welcome history only when the whole messages table is empty.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(messagesTable);
  if ((n ?? 0) === 0) {
    const general = byName.get("general");
    const opportunities = byName.get("opportunities");
    const compliance = byName.get("compliance-alerts");
    const now = Date.now();
    const welcome: Array<{
      channelId: string;
      authorName: string;
      body: string;
      createdAt: Date;
    }> = [];
    if (general) {
      welcome.push({
        channelId: general.id,
        authorName: "Pipeline Bot",
        body: "Pipeline chat is live — use #opportunities for tender noise and keep #general for team updates.",
        createdAt: new Date(now - 90 * 60_000),
      });
    }
    if (opportunities) {
      welcome.push(
        {
          channelId: opportunities.id,
          authorName: "Pipeline Bot",
          body: "Closing dates and new default-category matches will post here.",
          createdAt: new Date(now - 45 * 60_000),
        },
      );
    }
    if (compliance) {
      welcome.push({
        channelId: compliance.id,
        authorName: "Pipeline Bot",
        body: "Compliance reminders will appear in this channel.",
        createdAt: new Date(now - 10 * 60_000),
      });
    }
    if (welcome.length > 0) {
      await db.insert(messagesTable).values(welcome);
    }
  }

  return [...byName.values()]
    .map(toChannel)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function pgListChannels(): Promise<Channel[]> {
  return ensureDefaultChannels();
}

export async function pgGetChannel(id: string): Promise<Channel | null> {
  await ensureDefaultChannels();
  const rows = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, id))
    .limit(1);
  return rows[0] ? toChannel(rows[0]) : null;
}

export async function pgCreateChannel(
  input: CreateChannelInput,
): Promise<Channel> {
  await ensureDefaultChannels();
  const name = input.name
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
  if (!name) throw new Error("Channel name is required.");

  const existing = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.name, name))
    .limit(1);
  if (existing[0]) throw new Error(`#${name} already exists.`);

  const [row] = await db
    .insert(channelsTable)
    .values({
      name,
      kind: input.kind ?? "public",
      description: input.description?.trim() ?? "",
    })
    .returning();
  return toChannel(row);
}

export async function pgListMessages(channelId: string): Promise<ChatMessage[]> {
  const channel = await pgGetChannel(channelId);
  if (!channel) return [];

  // Full history for the channel (oldest → newest). Cap at 1000 for payload size.
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.channelId, channelId))
    .orderBy(asc(messagesTable.createdAt))
    .limit(1000);

  return rows.map(toMessage);
}

export async function pgCreateMessage(
  input: CreateMessageInput,
): Promise<ChatMessage> {
  const channel = await pgGetChannel(input.channelId);
  if (!channel) throw new Error("Channel not found.");

  const body = input.body.trim();
  if (!body) throw new Error("Message cannot be empty.");

  const [row] = await db
    .insert(messagesTable)
    .values({
      channelId: input.channelId,
      authorName: input.authorName?.trim() || "Pipeline",
      body,
    })
    .returning();

  return toMessage(row);
}
