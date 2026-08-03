import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  encodeSession,
  getSession,
} from "@/lib/auth/session";
import { setUserAvatarUrl } from "@/lib/auth/users";
import { processAvatarUpload } from "@/lib/avatars/process";
import {
  removeAvatarObject,
  uploadAvatarObject,
} from "@/lib/avatars/storage";

function withSessionCookie(
  body: unknown,
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "member" | "viewer";
    avatarUrl?: string | null;
  },
  init?: ResponseInit,
) {
  const response = NextResponse.json(body, init);
  response.cookies.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }

  // Users may only set their own avatar.
  const targetId = String(form.get("userId") ?? session.id);
  if (targetId !== session.id) {
    return NextResponse.json(
      { error: "You can only update your own profile picture." },
      { status: 403 },
    );
  }

  try {
    const { buffer } = await processAvatarUpload(file);
    const avatarUrl = await uploadAvatarObject(session.id, buffer);
    const user = await setUserAvatarUrl(session.id, avatarUrl);
    return withSessionCookie({ user }, user);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not upload avatar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let targetId = session.id;
  try {
    const body = (await request.json()) as { userId?: string };
    if (body.userId) targetId = body.userId;
  } catch {
    // empty body ok
  }

  if (targetId !== session.id) {
    return NextResponse.json(
      { error: "You can only remove your own profile picture." },
      { status: 403 },
    );
  }

  try {
    await removeAvatarObject(session.id);
    const user = await setUserAvatarUrl(session.id, null);
    return withSessionCookie({ user }, user);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not remove avatar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
