import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createMessage,
  getChannel,
  listMessages,
} from "@/lib/chat/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const channel = await getChannel(id);
  if (!channel) {
    return NextResponse.json({ error: "Channel not found." }, { status: 404 });
  }
  const messages = await listMessages(id);
  return NextResponse.json({ channel, messages });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const session = await getSession();
  const input = body as { body?: string; authorName?: string };
  try {
    const message = await createMessage({
      channelId: id,
      body: input.body ?? "",
      authorName: input.authorName || session?.name,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send message." },
      { status: 400 },
    );
  }
}
