import { NextResponse } from "next/server";
import { getSession, roleLabel } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const fresh = (await findUserById(session.id)) ?? session;
  return NextResponse.json({
    user: {
      id: fresh.id,
      name: fresh.name,
      email: fresh.email,
      role: fresh.role,
      roleLabel: roleLabel(fresh.role),
      avatarUrl: fresh.avatarUrl ?? null,
    },
  });
}
