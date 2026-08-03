import { NextResponse } from "next/server";
import {
  createUser,
  listAuthUsers,
  removeUserFromDb,
  updateUserRoleInDb,
} from "@/lib/auth/users";
import { USER_ROLES, type UserRole } from "@/lib/settings/types";

export async function GET() {
  try {
    const rows = await listAuthUsers();
    const users = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load users.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  try {
    const password =
      body.password?.trim() ||
      process.env.AUTH_SEED_PASSWORD?.trim() ||
      "PipelineChangeMe";
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
        users: rows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
        })),
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
  const body = (await request.json()) as { id?: string; role?: string };
  if (!body.id || !USER_ROLES.includes(body.role as UserRole)) {
    return NextResponse.json(
      { error: "User id and role are required." },
      { status: 400 },
    );
  }
  try {
    await updateUserRoleInDb(body.id, body.role as UserRole);
    const rows = await listAuthUsers();
    return NextResponse.json({
      users: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update user." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }
  try {
    await removeUserFromDb(body.id);
    const rows = await listAuthUsers();
    return NextResponse.json({
      users: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not remove user." },
      { status: 400 },
    );
  }
}
