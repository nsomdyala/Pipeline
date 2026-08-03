import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { avatarMapByNames } from "@/lib/auth/users";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const names = (searchParams.get("names") ?? "")
    .split("|")
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 50);
  try {
    const avatars = await avatarMapByNames(names);
    return NextResponse.json({ avatars });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not look up avatars.",
      },
      { status: 500 },
    );
  }
}
