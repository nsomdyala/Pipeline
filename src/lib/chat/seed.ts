import type { Channel, ChatMessage } from "@/lib/chat/types";

export function seedChannels(now = new Date()): Channel[] {
  const iso = now.toISOString();
  return [
    {
      id: "ch-general",
      name: "general",
      kind: "public",
      description: "Team-wide updates and day-to-day chat.",
      createdAt: iso,
    },
    {
      id: "ch-opportunities",
      name: "opportunities",
      kind: "public",
      description: "New matches, bid/no-bid calls and closing alerts.",
      createdAt: iso,
    },
    {
      id: "ch-compliance-alerts",
      name: "compliance-alerts",
      kind: "public",
      description: "Expiry reminders and vault status.",
      createdAt: iso,
    },
  ];
}

export function seedMessages(now = new Date()): ChatMessage[] {
  const ago = (minutes: number) =>
    new Date(now.getTime() - minutes * 60_000).toISOString();

  return [
    {
      id: "msg-1",
      channelId: "ch-general",
      authorName: "Ndumiso Somdyala",
      body: "Pipeline chat is live — use #opportunities for tender noise and keep #general for team updates.",
      createdAt: ago(90),
    },
    {
      id: "msg-2",
      channelId: "ch-opportunities",
      authorName: "Ndumiso Somdyala",
      body: "SAQA asset verification RFQ closes in 2 working days — please confirm bid/no-bid today.",
      createdAt: ago(45),
    },
    {
      id: "msg-3",
      channelId: "ch-opportunities",
      authorName: "Pipeline Bot",
      body: "New match: SITA RFQ-SITA-2607-09 · ICT software licence and support.",
      createdAt: ago(20),
    },
    {
      id: "msg-4",
      channelId: "ch-compliance-alerts",
      authorName: "Pipeline Bot",
      body: "Reminder: company proof of address expires in 14 days.",
      createdAt: ago(10),
    },
  ];
}
