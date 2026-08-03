import { NextResponse } from "next/server";
import { createChannel, listChannels } from "@/lib/chat/store";

export async function GET() {
  try {
    const channels = await listChannels();
    return NextResponse.json({ channels });
  } catch (err) {
    console.error("chat channels list failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load chat. Check DATABASE_URL.",
        channels: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = body as { name?: string; description?: string };
  try {
    const channel = await createChannel({
      name: input.name ?? "",
      description: input.description,
    });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create channel.",
      },
      { status: 400 },
    );
  }
}
