import { NextResponse } from "next/server";
import { addUser, removeUser, updateUserRole } from "@/lib/settings/store";
import { USER_ROLES, type UserRole } from "@/lib/settings/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    role?: string;
  };

  if (!USER_ROLES.includes(body.role as UserRole)) {
    return NextResponse.json(
      { error: "Role must be admin, member, or viewer." },
      { status: 400 },
    );
  }

  try {
    const { settings, user } = await addUser({
      name: body.name ?? "",
      email: body.email ?? "",
      role: body.role as UserRole,
    });
    return NextResponse.json({ settings, user }, { status: 201 });
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
    return NextResponse.json({ error: "User id and role are required." }, { status: 400 });
  }
  try {
    const settings = await updateUserRole(body.id, body.role as UserRole);
    return NextResponse.json({ settings });
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
    const settings = await removeUser(body.id);
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not remove user." },
      { status: 400 },
    );
  }
}
