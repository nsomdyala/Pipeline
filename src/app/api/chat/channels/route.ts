import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createChannel, listChannels } from "@/lib/chat/store";

export async function GET() {
  const auth = await requirePermission("chat", "view");
  if (!auth.ok) return auth.response;

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
  const auth = await requirePermission("chat", "create");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = body as {
    name?: string;
    description?: string;
    kind?: "public" | "dm" | "opportunity" | "idea";
  };
  try {
    const channel = await createChannel({
      name: input.name ?? "",
      description: input.description,
      kind: input.kind,
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
