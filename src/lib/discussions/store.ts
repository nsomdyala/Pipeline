import { randomUUID } from "node:crypto";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import type { DiscussionTopic, TopicCategory } from "@/lib/discussions/types";

const FILE = "discussions.json";

function seed(): DiscussionTopic[] {
  const now = new Date();
  const iso = now.toISOString();
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
  return [
    {
      id: "topic-tih-delivery",
      title: "The Innovation Hub — delivery lessons and handover checklist",
      category: "Lessons learned",
      body: "Capture what worked on the TIH digital platforms engagement so the next website award runs smoother.",
      linkedTo: "The Innovation Hub · TIH-ICT-2025-014",
      pinned: true,
      solved: false,
      authorName: "Ndumiso Somdyala",
      posts: [
        {
          id: "post-1",
          authorName: "Ndumiso Somdyala",
          body: "Keep appointment letter + signed SLA in Accounts docs before first invoice milestone.",
          createdAt: ago(20),
        },
      ],
      createdAt: ago(48),
      updatedAt: ago(20),
    },
    {
      id: "topic-saqa-bid",
      title: "SAQA asset verification — bid/no-bid framing",
      category: "Strategy",
      body: "Do we have capacity to deliver tagging + mobile capture in the stated timeline?",
      linkedTo: "RFQ-SAQA-2026-041",
      pinned: false,
      solved: false,
      authorName: "Ndumiso Somdyala",
      posts: [],
      createdAt: ago(12),
      updatedAt: ago(12),
    },
    {
      id: "topic-sita-lane",
      title: "SITA RFQ lane scoring — ICT keywords",
      category: "Product",
      body: "Tune the matcher for licence / support / software RFQs so SITA noise stays useful.",
      linkedTo: "Intake · SITA adapter",
      pinned: false,
      solved: true,
      authorName: "Ndumiso Somdyala",
      posts: [
        {
          id: "post-2",
          authorName: "Pipeline Bot",
          body: "Decision: keep negative keyword filter for hardware-only bulk switch RFQs.",
          createdAt: ago(6),
        },
      ],
      createdAt: ago(30),
      updatedAt: ago(6),
    },
  ];
}

async function ensure(): Promise<DiscussionTopic[]> {
  const existing = await readJsonFile<DiscussionTopic[]>(FILE, []);
  if (existing.length > 0) return existing;
  const seeded = seed();
  await writeJsonFile(FILE, seeded);
  return seeded;
}

export async function listTopics() {
  const topics = await ensure();
  return topics.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function createTopic(input: {
  title: string;
  category: TopicCategory;
  body: string;
  linkedTo?: string;
}) {
  const now = new Date().toISOString();
  const topic: DiscussionTopic = {
    id: randomUUID(),
    title: input.title.trim(),
    category: input.category,
    body: input.body.trim(),
    linkedTo: input.linkedTo?.trim() ?? "",
    pinned: false,
    solved: false,
    authorName: "Ndumiso Somdyala",
    posts: [],
    createdAt: now,
    updatedAt: now,
  };
  const topics = await ensure();
  topics.unshift(topic);
  await writeJsonFile(FILE, topics);
  return topic;
}

export async function addReply(topicId: string, body: string) {
  const topics = await ensure();
  const index = topics.findIndex((t) => t.id === topicId);
  if (index < 0) return null;
  const now = new Date().toISOString();
  topics[index].posts.push({
    id: randomUUID(),
    authorName: "Ndumiso Somdyala",
    body: body.trim(),
    createdAt: now,
  });
  topics[index].updatedAt = now;
  await writeJsonFile(FILE, topics);
  return topics[index];
}
