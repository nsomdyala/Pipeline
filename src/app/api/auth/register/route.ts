import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { encodeSession } from "@/lib/auth/session";
import { createUser, ensureSeedAdmin } from "@/lib/auth/users";

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured on the server." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 },
      );
    }

    await ensureSeedAdmin();

    const user = await createUser({
      name,
      email,
      password,
      role: "member",
    });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, encodeSession(user), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (err) {
    console.error("register failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create account.",
      },
      { status: 400 },
    );
  }
}
