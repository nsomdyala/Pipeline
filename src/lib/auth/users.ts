import "server-only";

import { createHash, randomBytes } from "crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { SessionUser } from "@/lib/auth/session";
import type { UserStatus } from "@/lib/permissions/types";
import { USER_ROLES, type UserRole } from "@/lib/settings/types";

export type DbUser = typeof users.$inferSelect;

const PRIMARY_ADMIN_EMAIL = "nsomdyala@maxattention.tech";

function normalizeStatus(value: string | null | undefined): UserStatus {
  if (
    value === "active" ||
    value === "invited" ||
    value === "suspended" ||
    value === "deactivated"
  ) {
    return value;
  }
  return "active";
}

function toSession(user: DbUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    status: normalizeStatus(user.status),
  };
}

export function mapManagedUser(user: DbUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    status: normalizeStatus(user.status),
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
  };
}

export type ManagedUser = ReturnType<typeof mapManagedUser>;

function isSystemOrKnownRole(role: string): boolean {
  return USER_ROLES.includes(role as UserRole) || role === "client" || role.length > 0;
}

export async function findUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ? toSession(rows[0]) : null;
}

export async function findDbUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function setUserAvatarUrl(id: string, avatarUrl: string | null) {
  const [row] = await db
    .update(users)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found.");
  return toSession(row);
}

/** Resolve avatar URLs for chat/discussion authors by display name (case-insensitive). */
export async function avatarMapByNames(
  names: string[],
): Promise<Record<string, string | null>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  const all = await listAuthUsers();
  const map: Record<string, string | null> = {};
  for (const name of unique) {
    const match = all.find(
      (u) => u.name.trim().toLowerCase() === name.toLowerCase(),
    );
    map[name] = match?.avatarUrl ?? null;
  }
  return map;
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

/** List users for admin UI (includes deactivated for audit trail). */
export async function listAuthUsers(opts?: { includeDeactivated?: boolean }) {
  const includeDeactivated = opts?.includeDeactivated ?? true;
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  if (includeDeactivated) return rows;
  return rows.filter((u) => normalizeStatus(u.status) !== "deactivated");
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: string;
  status?: UserStatus;
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

  const role = input.role?.trim() || "member";
  if (!isSystemOrKnownRole(role)) {
    throw new Error("Invalid role.");
  }

  const [row] = await db
    .insert(users)
    .values({
      name,
      email,
      role,
      passwordHash: hashPassword(input.password),
      status: input.status ?? "active",
    })
    .returning();

  return toSession(row);
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Create invited user with unusable password + invite token. */
export async function inviteUser(input: {
  name: string;
  email: string;
  role: string;
}): Promise<{ user: ManagedUser; inviteToken: string; inviteUrlPath: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role.trim();
  if (!name || !email || !role) {
    throw new Error("Name, email and role are required.");
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("A user with that email already exists.");
  }

  const inviteToken = randomBytes(32).toString("base64url");
  const placeholderPassword = randomBytes(32).toString("hex");

  const [row] = await db
    .insert(users)
    .values({
      name,
      email,
      role,
      passwordHash: hashPassword(placeholderPassword),
      status: "invited",
      inviteTokenHash: hashInviteToken(inviteToken),
      inviteExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
    })
    .returning();

  return {
    user: mapManagedUser(row),
    inviteToken,
    inviteUrlPath: `/set-password?token=${inviteToken}`,
  };
}

export async function resendInvite(userId: string) {
  const user = await findDbUserById(userId);
  if (!user) throw new Error("User not found.");
  if (normalizeStatus(user.status) === "deactivated") {
    throw new Error("Cannot invite a deactivated user.");
  }

  const inviteToken = randomBytes(32).toString("base64url");
  const [row] = await db
    .update(users)
    .set({
      status: "invited",
      inviteTokenHash: hashInviteToken(inviteToken),
      inviteExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return {
    user: mapManagedUser(row),
    inviteToken,
    inviteUrlPath: `/set-password?token=${inviteToken}`,
  };
}

export async function completeInvite(token: string, password: string) {
  if (!token || password.length < 8) {
    throw new Error("Valid invite token and password (8+ chars) are required.");
  }
  const tokenHash = hashInviteToken(token);
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.inviteTokenHash, tokenHash))
    .limit(1);
  const user = rows[0];
  if (!user) throw new Error("Invalid or expired invite link.");
  if (user.inviteExpiresAt && user.inviteExpiresAt.getTime() < Date.now()) {
    throw new Error("This invite link has expired. Ask an admin to resend it.");
  }
  if (normalizeStatus(user.status) === "deactivated") {
    throw new Error("This account has been deactivated.");
  }

  const [row] = await db
    .update(users)
    .set({
      passwordHash: hashPassword(password),
      status: "active",
      inviteTokenHash: null,
      inviteExpiresAt: null,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return toSession(row);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const status = normalizeStatus(user.status);
  if (status === "suspended" || status === "deactivated") return null;
  if (status === "invited") return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  await db
    .update(users)
    .set({ lastActiveAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return toSession({ ...user, lastActiveAt: new Date(), status: "active" });
}

export async function touchLastActive(id: string) {
  try {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, id));
  } catch {
    // optional column may be missing pre-migration
  }
}

export async function updateUserInDb(
  id: string,
  input: { name?: string; email?: string; role?: string },
) {
  const patch: Partial<DbUser> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.email !== undefined) patch.email = input.email.trim().toLowerCase();
  if (input.role !== undefined) {
    const role = input.role.trim();
    if (!isSystemOrKnownRole(role)) throw new Error("Invalid role.");
    patch.role = role;
  }

  const [row] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found.");
  return mapManagedUser(row);
}

export async function updateUserRoleInDb(id: string, role: string) {
  return updateUserInDb(id, { role });
}

export async function setUserStatusInDb(id: string, status: UserStatus) {
  const user = await findDbUserById(id);
  if (!user) throw new Error("User not found.");
  if (user.email === PRIMARY_ADMIN_EMAIL && status !== "active") {
    throw new Error("The primary admin cannot be suspended or deactivated.");
  }

  const [row] = await db
    .update(users)
    .set({
      status,
      deactivatedAt: status === "deactivated" ? new Date() : null,
      updatedAt: new Date(),
      ...(status === "active"
        ? { inviteTokenHash: null, inviteExpiresAt: null }
        : {}),
    })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found.");
  return mapManagedUser(row);
}

export async function setUserPasswordInDb(id: string, password: string) {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const [row] = await db
    .update(users)
    .set({
      passwordHash: hashPassword(password),
      status: "active",
      inviteTokenHash: null,
      inviteExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found.");
  return toSession(row);
}

/**
 * Soft-delete: mark deactivated. Never hard-deletes (preserves audit trail).
 * FLAG: previously this hard-deleted the row — behaviour changed by design.
 */
export async function removeUserFromDb(id: string) {
  const user = await findDbUserById(id);
  if (!user) throw new Error("User not found.");
  if (user.email === PRIMARY_ADMIN_EMAIL) {
    throw new Error("The primary admin cannot be removed.");
  }
  await setUserStatusInDb(id, "deactivated");
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
    email: PRIMARY_ADMIN_EMAIL,
    role: "admin",
    passwordHash: hashPassword(password),
    status: "active",
  });
}

/** Count active users with a role (excludes deactivated). */
export async function countUsersWithRole(role: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, role), ne(users.status, "deactivated")));
  return rows.length;
}
