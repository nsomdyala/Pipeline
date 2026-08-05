import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit/write";
import { requireUsersAdmin } from "@/lib/auth/require-permission";
import {
  createUser,
  inviteUser,
  listAuthUsers,
  mapManagedUser,
  removeUserFromDb,
  resendInvite,
  setUserPasswordInDb,
  setUserStatusInDb,
  updateUserInDb,
} from "@/lib/auth/users";
import { getRole } from "@/lib/permissions/store";
import type { UserStatus } from "@/lib/permissions/types";

function mapUsers(rows: Awaited<ReturnType<typeof listAuthUsers>>) {
  return rows.map(mapManagedUser);
}

export async function GET() {
  const auth = await requireUsersAdmin();
  if (!auth.ok) return auth.response;

  try {
    const rows = await listAuthUsers({ includeDeactivated: true });
    return NextResponse.json({ users: mapUsers(rows) });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not load users.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUsersAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    role?: string;
    password?: string;
    mode?: "create" | "invite";
  };

  const role = body.role?.trim() ?? "";
  const roleRow = await getRole(role);
  if (!roleRow) {
    return NextResponse.json(
      { error: "Unknown role. Choose a system or custom role." },
      { status: 400 },
    );
  }

  const mode = body.mode === "invite" ? "invite" : "create";

  try {
    if (mode === "invite") {
      const invited = await inviteUser({
        name: body.name ?? "",
        email: body.email ?? "",
        role,
      });
      await writeAudit({
        actorUserId: auth.session.id,
        actorEmail: auth.session.email,
        actorName: auth.session.name,
        entityType: "user",
        entityId: invited.user.id,
        action: "invite",
        diff: { role, email: invited.user.email },
      });
      const rows = await listAuthUsers();
      const origin =
        process.env.APP_BASE_URL?.replace(/\/$/, "") ||
        new URL(request.url).origin;
      return NextResponse.json(
        {
          user: invited.user,
          users: mapUsers(rows),
          inviteUrl: `${origin}${invited.inviteUrlPath}`,
          message:
            "Invite created. No email provider is configured — copy the invite link and share it with the user so they can set a password.",
        },
        { status: 201 },
      );
    }

    const password = body.password?.trim() ?? "";
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Set a password of at least 8 characters, or use Invite mode." },
        { status: 400 },
      );
    }

    const user = await createUser({
      name: body.name ?? "",
      email: body.email ?? "",
      password,
      role,
      status: "active",
    });
    await writeAudit({
      actorUserId: auth.session.id,
      actorEmail: auth.session.email,
      actorName: auth.session.name,
      entityType: "user",
      entityId: user.id,
      action: "create",
      diff: { role, email: user.email },
    });
    const rows = await listAuthUsers();
    return NextResponse.json(
      {
        user,
        users: mapUsers(rows),
        message: `${user.name} can sign in at /login with their email and the password you set.`,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not add user." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUsersAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    password?: string;
    status?: UserStatus;
    action?: "resend_invite";
  };

  if (!body.id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  try {
    if (body.action === "resend_invite") {
      const invited = await resendInvite(body.id);
      await writeAudit({
        actorUserId: auth.session.id,
        actorEmail: auth.session.email,
        actorName: auth.session.name,
        entityType: "user",
        entityId: body.id,
        action: "resend_invite",
      });
      const rows = await listAuthUsers();
      const origin =
        process.env.APP_BASE_URL?.replace(/\/$/, "") ||
        new URL(request.url).origin;
      return NextResponse.json({
        users: mapUsers(rows),
        inviteUrl: `${origin}${invited.inviteUrlPath}`,
        message:
          "Invite refreshed. Copy the link — email delivery is not configured yet.",
      });
    }

    if (body.status) {
      await setUserStatusInDb(body.id, body.status);
      await writeAudit({
        actorUserId: auth.session.id,
        actorEmail: auth.session.email,
        actorName: auth.session.name,
        entityType: "user",
        entityId: body.id,
        action: `status:${body.status}`,
      });
    }

    if (body.password?.trim()) {
      await setUserPasswordInDb(body.id, body.password.trim());
      await writeAudit({
        actorUserId: auth.session.id,
        actorEmail: auth.session.email,
        actorName: auth.session.name,
        entityType: "user",
        entityId: body.id,
        action: "reset_password",
      });
    }

    if (
      body.name !== undefined ||
      body.email !== undefined ||
      body.role !== undefined
    ) {
      if (body.role) {
        const roleRow = await getRole(body.role);
        if (!roleRow) {
          return NextResponse.json(
            { error: "Unknown role." },
            { status: 400 },
          );
        }
      }
      await updateUserInDb(body.id, {
        name: body.name,
        email: body.email,
        role: body.role,
      });
      await writeAudit({
        actorUserId: auth.session.id,
        actorEmail: auth.session.email,
        actorName: auth.session.name,
        entityType: "user",
        entityId: body.id,
        action: "update",
        diff: {
          name: body.name,
          email: body.email,
          role: body.role,
        },
      });
    } else if (!body.password?.trim() && !body.status) {
      return NextResponse.json(
        { error: "Provide fields to update, a status, or a password." },
        { status: 400 },
      );
    }

    const rows = await listAuthUsers();
    return NextResponse.json({ users: mapUsers(rows) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update user." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireUsersAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }
  if (body.id === auth.session.id) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account while signed in." },
      { status: 400 },
    );
  }

  try {
    // Soft-delete (deactivated) — never hard-delete history.
    await removeUserFromDb(body.id);
    await writeAudit({
      actorUserId: auth.session.id,
      actorEmail: auth.session.email,
      actorName: auth.session.name,
      entityType: "user",
      entityId: body.id,
      action: "deactivate",
    });
    const rows = await listAuthUsers();
    return NextResponse.json({ users: mapUsers(rows) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not remove user." },
      { status: 400 },
    );
  }
}
