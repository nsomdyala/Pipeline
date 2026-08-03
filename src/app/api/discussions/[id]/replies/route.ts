import { NextResponse } from "next/server";
import { addReply } from "@/lib/discussions/store";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { body?: string };
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Reply body is required." }, { status: 400 });
  }
  const topic = await addReply(id, body.body);
  if (!topic) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }
  return NextResponse.json({ topic }, { status: 201 });
}
