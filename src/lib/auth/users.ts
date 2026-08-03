import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { SessionUser } from "@/lib/auth/session";
import { USER_ROLES, type UserRole } from "@/lib/settings/types";

export type DbUser = typeof users.$inferSelect;

function toSession(user: DbUser): SessionUser {
  const role = USER_ROLES.includes(user.role as UserRole)
    ? (user.role as UserRole)
    : "member";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
  };
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAuthUsers() {
  return db.select().from(users).orderBy(asc(users.createdAt));
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}): Promise<SessionUser> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name || !email || !input.password) {
    throw new Error("Name, email and password are required.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("A user with that email already exists.");
  }

  const [row] = await db
    .insert(users)
    .values({
      name,
      email,
      role: input.role ?? "member",
      passwordHash: hashPassword(input.password),
    })
    .returning();

  return toSession(row);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return toSession(user);
}

export async function updateUserRoleInDb(id: string, role: UserRole) {
  const [row] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found.");
  return toSession(row);
}

export async function setUserPasswordInDb(id: string, password: string) {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const [row] = await db
    .update(users)
    .set({
      passwordHash: hashPassword(password),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found.");
  return toSession(row);
}

export async function removeUserFromDb(id: string) {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user[0]) throw new Error("User not found.");
  if (user[0].email === "nsomdyala@maxattention.tech") {
    throw new Error("The primary admin cannot be removed.");
  }
  await db.delete(users).where(eq(users.id, id));
}

/** Create the seeded admin if the users table is empty. */
export async function ensureSeedAdmin() {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) return;

  const password =
    process.env.AUTH_SEED_PASSWORD?.trim() ||
    process.env.DEMO_PASSWORD?.trim() ||
    "Pipeline";

  await db.insert(users).values({
    name: "Ndumiso Somdyala",
    email: "nsomdyala@maxattention.tech",
    role: "admin",
    passwordHash: hashPassword(password),
  });
}
