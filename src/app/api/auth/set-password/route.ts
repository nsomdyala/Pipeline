import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { encodeSession } from "@/lib/auth/session";
import { completeInvite } from "@/lib/auth/users";
import { writeAudit } from "@/lib/audit/write";

/**
 * Completes an invite: sets password using the invite token.
 * Reuses the same session cookie pattern as login/register.
 *
 * FLAG: No email provider is configured. Admins copy invite links from Settings.
 * Optional future env: APP_BASE_URL (absolute links), SMTP_* / RESEND_API_KEY for delivery.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured on the server." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };

    const user = await completeInvite(body.token ?? "", body.password ?? "");
    await writeAudit({
      actorUserId: user.id,
      actorEmail: user.email,
      actorName: user.name,
      entityType: "user",
      entityId: user.id,
      action: "accept_invite",
    });

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, encodeSession(user), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not set password.",
      },
      { status: 400 },
    );
  }
}
