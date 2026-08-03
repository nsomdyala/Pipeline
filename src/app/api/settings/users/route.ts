import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createUser,
  listAuthUsers,
  removeUserFromDb,
  setUserPasswordInDb,
  updateUserRoleInDb,
} from "@/lib/auth/users";
import { USER_ROLES, type UserRole } from "@/lib/settings/types";

function mapUsers(
  rows: Awaited<ReturnType<typeof listAuthUsers>>,
) {
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    avatarUrl: u.avatarUrl ?? null,
  }));
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const rows = await listAuthUsers();
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
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    role?: string;
    password?: string;
  };

  if (!USER_ROLES.includes(body.role as UserRole)) {
    return NextResponse.json(
      { error: "Role must be admin, member, or viewer." },
      { status: 400 },
    );
  }

  const password = body.password?.trim() ?? "";
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Set a password of at least 8 characters for this user." },
      { status: 400 },
    );
  }

  try {
    const user = await createUser({
      name: body.name ?? "",
      email: body.email ?? "",
      password,
      role: body.role as UserRole,
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
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    id?: string;
    role?: string;
    password?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  try {
    if (body.password?.trim()) {
      await setUserPasswordInDb(body.id, body.password.trim());
    }
    if (body.role && USER_ROLES.includes(body.role as UserRole)) {
      await updateUserRoleInDb(body.id, body.role as UserRole);
    } else if (!body.password?.trim()) {
      return NextResponse.json(
        { error: "Provide a role and/or a new password." },
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
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }
  if (body.id === auth.session.id) {
    return NextResponse.json(
      { error: "You cannot remove your own account while signed in." },
      { status: 400 },
    );
  }

  try {
    await removeUserFromDb(body.id);
    const rows = await listAuthUsers();
    return NextResponse.json({ users: mapUsers(rows) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not remove user." },
      { status: 400 },
    );
  }
}
