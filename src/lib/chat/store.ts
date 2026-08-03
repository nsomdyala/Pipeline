import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { seedChannels, seedMessages } from "@/lib/chat/seed";
import type {
  Channel,
  ChatMessage,
  CreateChannelInput,
  CreateMessageInput,
} from "@/lib/chat/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const CHANNELS_FILE = path.join(DATA_DIR, "chat-channels.json");
const MESSAGES_FILE = path.join(DATA_DIR, "chat-messages.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    await writeFile(file, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

async function ensureChannels(): Promise<Channel[]> {
  const existing = await readJson<Channel[]>(CHANNELS_FILE, []);
  if (existing.length > 0) return existing;
  const seeded = seedChannels();
  await writeJson(CHANNELS_FILE, seeded);
  return seeded;
}

async function ensureMessages(): Promise<ChatMessage[]> {
  const existing = await readJson<ChatMessage[]>(MESSAGES_FILE, []);
  if (existing.length > 0) return existing;
  const seeded = seedMessages();
  await writeJson(MESSAGES_FILE, seeded);
  return seeded;
}

export async function listChannels(): Promise<Channel[]> {
  const channels = await ensureChannels();
  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getChannel(id: string): Promise<Channel | null> {
  const channels = await ensureChannels();
  return channels.find((c) => c.id === id) ?? null;
}

export async function createChannel(
  input: CreateChannelInput,
): Promise<Channel> {
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
  await writeJson(CHANNELS_FILE, channels);
  return channel;
}

export async function listMessages(channelId: string): Promise<ChatMessage[]> {
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
  await writeJson(MESSAGES_FILE, messages);
  return message;
}
