import "server-only";

import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth/session";

export async function requireAdmin(): Promise<
  { ok: true; session: SessionUser } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in required." },
        { status: 401 },
      ),
    };
  }
  if (session.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only admins can manage portal users." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session };
}
