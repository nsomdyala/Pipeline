import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createTopic, listTopics } from "@/lib/discussions/store";
import { TOPIC_CATEGORIES, type TopicCategory } from "@/lib/discussions/types";

export async function GET() {
  const auth = await requirePermission("discussions", "view");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ topics: await listTopics() });
}

export async function POST(request: Request) {
  const auth = await requirePermission("discussions", "create");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const body = (await request.json()) as {
    title?: string;
    category?: string;
    body?: string;
    linkedTo?: string;
  };
  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json(
      { error: "Title and body are required." },
      { status: 400 },
    );
  }
  if (!TOPIC_CATEGORIES.includes(body.category as TopicCategory)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const topic = await createTopic({
    title: body.title,
    category: body.category as TopicCategory,
    body: body.body,
    linkedTo: body.linkedTo,
    authorName: session?.name,
  });
  return NextResponse.json({ topic }, { status: 201 });
}
