import { NextResponse } from "next/server";
import { DEMO_PASSWORD, SESSION_COOKIE } from "@/lib/auth/constants";
import { encodeSession, type SessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings/store";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  if (password.trim().toLowerCase() !== DEMO_PASSWORD.toLowerCase()) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const settings = await getSettings();
  const existing = settings.users.find((u) => u.email.toLowerCase() === email);

  const domainOk = email.endsWith("@maxattention.tech");
  if (!existing && !domainOk) {
    return NextResponse.json(
      { error: "Use a Max Attention Technologies account." },
      { status: 401 },
    );
  }

  const user: SessionUser = existing
    ? {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
      }
    : {
        id: randomUUID(),
        name: email.split("@")[0].replace(/[._]/g, " "),
        email,
        role: "member",
      };

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
