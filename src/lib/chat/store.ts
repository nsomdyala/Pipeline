import "server-only";

import { randomUUID } from "node:crypto";
import { seedChannels, seedMessages } from "@/lib/chat/seed";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import type {
  Channel,
  ChatMessage,
  CreateChannelInput,
  CreateMessageInput,
} from "@/lib/chat/types";

const CHANNELS_FILE = "chat-channels.json";
const MESSAGES_FILE = "chat-messages.json";

function usePostgres() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function ensureChannels(): Promise<Channel[]> {
  const existing = await readJsonFile<Channel[]>(CHANNELS_FILE, []);
  if (existing.length > 0) return existing;
  const seeded = seedChannels();
  await writeJsonFile(CHANNELS_FILE, seeded);
  return seeded;
}

async function ensureMessages(): Promise<ChatMessage[]> {
  const existing = await readJsonFile<ChatMessage[]>(MESSAGES_FILE, []);
  if (existing.length > 0) return existing;
  const seeded = seedMessages();
  await writeJsonFile(MESSAGES_FILE, seeded);
  return seeded;
}

export async function listChannels(): Promise<Channel[]> {
  if (usePostgres()) {
    const { pgListChannels } = await import("@/lib/chat/pg-store");
    return pgListChannels();
  }
  const channels = await ensureChannels();
  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getChannel(id: string): Promise<Channel | null> {
  if (usePostgres()) {
    const { pgGetChannel } = await import("@/lib/chat/pg-store");
    return pgGetChannel(id);
  }
  const channels = await ensureChannels();
  return channels.find((c) => c.id === id) ?? null;
}

export async function createChannel(
  input: CreateChannelInput,
): Promise<Channel> {
  if (usePostgres()) {
    const { pgCreateChannel } = await import("@/lib/chat/pg-store");
    return pgCreateChannel(input);
  }

  const name = input.name
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

  if (!name) throw new Error("Channel name is required.");

  const channels = await ensureChannels();
  if (channels.some((c) => c.name === name)) {
    throw new Error(`#${name} already exists.`);
  }

  const channel: Channel = {
    id: randomUUID(),
    name,
    kind: input.kind ?? "public",
    description: input.description?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };

  channels.push(channel);
  await writeJsonFile(CHANNELS_FILE, channels);
  return channel;
}

export async function listMessages(channelId: string): Promise<ChatMessage[]> {
  if (usePostgres()) {
    const { pgListMessages } = await import("@/lib/chat/pg-store");
    return pgListMessages(channelId);
  }
  const messages = await ensureMessages();
  return messages
    .filter((m) => m.channelId === channelId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

export async function createMessage(
  input: CreateMessageInput,
): Promise<ChatMessage> {
  if (usePostgres()) {
    const { pgCreateMessage } = await import("@/lib/chat/pg-store");
    return pgCreateMessage(input);
  }

  const channel = await getChannel(input.channelId);
  if (!channel) throw new Error("Channel not found.");

  const body = input.body.trim();
  if (!body) throw new Error("Message cannot be empty.");

  const message: ChatMessage = {
    id: randomUUID(),
    channelId: input.channelId,
    authorName: input.authorName?.trim() || "Ndumiso Somdyala",
    body,
    createdAt: new Date().toISOString(),
  };

  const messages = await ensureMessages();
  messages.push(message);
  await writeJsonFile(MESSAGES_FILE, messages);
  return message;
}
