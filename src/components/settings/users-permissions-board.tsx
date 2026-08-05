"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  ACTION_LABELS,
  MODULE_LABELS,
  type PermissionAction,
  type PermissionModule,
  type UserStatus,
} from "@/lib/permissions/types";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  status: UserStatus;
  lastActiveAt?: string | null;
  createdAt?: string | null;
};

type RoleRow = {
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissions: Array<{
    module: PermissionModule;
    action: PermissionAction;
    allowed: boolean;
  }>;
};

type ModuleMeta = {
  key: PermissionModule;
  label: string;
  actions: PermissionAction[];
};

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
  deactivated: "Deactivated",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

const emptyForm = {
  name: "",
  email: "",
  role: "member",
  password: "",
  mode: "invite" as "invite" | "create",
};

export function UsersPermissionsBoard() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [modules, setModules] = useState<ModuleMeta[]>([]);
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", email: "", role: "" });
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState({
    name: "",
    description: "",
    permissions: [] as RoleRow["permissions"],
  });
  const [newRole, setNewRole] = useState({
    key: "",
    name: "",
    description: "",
  });
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  function loadAll() {
    return Promise.all([
      fetch("/api/settings/users").then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load users.");
        return d.users as ManagedUser[];
      }),
      fetch("/api/settings/roles").then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load roles.");
        return d as { roles: RoleRow[]; modules: ModuleMeta[] };
      }),
    ])
      .then(([u, r]) => {
        setUsers(u);
        setRoles(r.roles);
        setModules(r.modules);
        if (!selectedRoleKey && r.roles[0]) {
          setSelectedRoleKey(r.roles[0].key);
          setRoleDraft({
            name: r.roles[0].name,
            description: r.roles[0].description,
            permissions: r.roles[0].permissions,
          });
        }
        setLoaded(true);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoaded(true);
      });
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ key: r.key, name: r.name })),
    [roles],
  );

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, statusFilter, query]);

  const selectedRole = roles.find((r) => r.key === selectedRoleKey) ?? null;

  function selectRole(role: RoleRow) {
    setSelectedRoleKey(role.key);
    setRoleDraft({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
  }

  function roleName(key: string) {
    return roles.find((r) => r.key === key)?.name ?? key;
  }

  function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setInviteUrl(null);
    startTransition(async () => {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          mode: form.mode,
          password: form.mode === "create" ? form.password : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add user.");
        return;
      }
      if (data.users) setUsers(data.users);
      setNotice(data.message ?? "User saved.");
      if (data.inviteUrl) setInviteUrl(data.inviteUrl);
      setForm(emptyForm);
      setShowAdd(false);
    });
  }

  function patchUser(body: Record<string, unknown>, okMessage?: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fetch("/api/settings/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update user.");
        return;
      }
      if (data.users) setUsers(data.users);
      if (data.inviteUrl) setInviteUrl(data.inviteUrl);
      if (okMessage || data.message) setNotice(okMessage ?? data.message);
      setEditingId(null);
    });
  }

  function deactivateUser(id: string) {
    if (!window.confirm("Deactivate this user? History is preserved.")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/settings/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not deactivate user.");
        return;
      }
      if (data.users) setUsers(data.users);
      setNotice("User deactivated (soft-delete).");
    });
  }

  function saveRoleMatrix() {
    if (!selectedRoleKey) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/settings/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedRoleKey,
          name: roleDraft.name,
          description: roleDraft.description,
          permissions: roleDraft.permissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save role.");
        return;
      }
      setNotice("Role permissions saved.");
      await loadAll();
    });
  }

  function createRole(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create role.");
        return;
      }
      setNewRole({ key: "", name: "", description: "" });
      setNotice(`Role “${data.role.name}” created.`);
      await loadAll();
      if (data.role?.key) {
        setSelectedRoleKey(data.role.key);
      }
    });
  }

  function togglePerm(module: PermissionModule, action: PermissionAction) {
    setRoleDraft((draft) => {
      const exists = draft.permissions.find(
        (p) => p.module === module && p.action === action,
      );
      if (exists) {
        return {
          ...draft,
          permissions: draft.permissions.map((p) =>
            p.module === module && p.action === action
              ? { ...p, allowed: !p.allowed }
              : p,
          ),
        };
      }
      return {
        ...draft,
        permissions: [
          ...draft.permissions,
          { module, action, allowed: true },
        ],
      };
    });
  }

  if (!loaded) {
    return (
      <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6">
        <p className="text-sm text-muted">Loading users & permissions…</p>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Users & Permissions
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Manage team members, roles, and what each role can do. Admin /
            Director only. Soft-delete preserves history.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("users")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${tab === "users" ? "bg-navy text-white" : "bg-mist/60 text-navy hover:bg-mist"}`}
          >
            Users
          </button>
          <button
            type="button"
            onClick={() => setTab("roles")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${tab === "roles" ? "bg-navy text-white" : "bg-mist/60 text-navy hover:bg-mist"}`}
          >
            Roles
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-semibold text-coral" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm font-semibold text-navy" role="status">
          {notice}
        </p>
      ) : null}
      {inviteUrl ? (
        <div className="mt-3 rounded-xl border border-navy/10 bg-mist/40 p-3">
          <p className="label-mono mb-1">Invite link (copy & share)</p>
          <p className="break-all font-mono text-xs text-ink">{inviteUrl}</p>
          <p className="mt-2 text-xs text-muted">
            No email provider configured. Set APP_BASE_URL for absolute links;
            add SMTP/Resend later to send automatically.
          </p>
        </div>
      ) : null}

      {tab === "users" ? (
        <>
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="label-mono">Search</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or email"
                  className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm outline-none ring-mint/40 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="label-mono">Role</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm outline-none ring-mint/40 focus:ring-2"
                >
                  <option value="all">All roles</option>
                  {roleOptions.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-mono">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm outline-none ring-mint/40 focus:ring-2"
                >
                  <option value="all">All statuses</option>
                  {(Object.keys(STATUS_LABEL) as UserStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAdd((v) => !v);
                setError(null);
                setNotice(null);
              }}
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-white"
            >
              {showAdd ? "Cancel" : "Invite / add user"}
            </button>
          </div>

          {showAdd ? (
            <form
              onSubmit={addUser}
              className="mt-5 grid gap-4 rounded-xl border border-navy/8 bg-mist/30 p-4 md:grid-cols-2"
            >
              <label className="block">
                <span className="label-mono">Full name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm outline-none ring-mint/40 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="label-mono">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-mono text-sm outline-none ring-mint/40 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="label-mono">Role</span>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm outline-none ring-mint/40 focus:ring-2"
                >
                  {roleOptions.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-mono">Mode</span>
                <select
                  value={form.mode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      mode: e.target.value as "invite" | "create",
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm outline-none ring-mint/40 focus:ring-2"
                >
                  <option value="invite">Send invite (set-password link)</option>
                  <option value="create">Create directly (set password)</option>
                </select>
              </label>
              {form.mode === "create" ? (
                <label className="block md:col-span-2">
                  <span className="label-mono">Temporary password</span>
                  <input
                    required
                    type="text"
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-mono text-sm outline-none ring-mint/40 focus:ring-2"
                  />
                </label>
              ) : null}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {pending
                    ? "Saving…"
                    : form.mode === "invite"
                      ? "Create invite"
                      : "Create user"}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">Role</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Last active</th>
                  <th className="py-2 pr-3 font-semibold">Date added</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isPrimary =
                    user.email === "nsomdyala@maxattention.tech";
                  const editing = editingId === user.id;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-navy/5 align-top"
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={user.name}
                            src={user.avatarUrl}
                            size={32}
                          />
                          {editing ? (
                            <input
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  name: e.target.value,
                                }))
                              }
                              className="w-36 rounded-lg border border-navy/10 px-2 py-1 text-sm"
                            />
                          ) : (
                            <span className="font-semibold text-ink">
                              {user.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-muted">
                        {editing ? (
                          <input
                            value={editDraft.email}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                email: e.target.value,
                              }))
                            }
                            className="w-44 rounded-lg border border-navy/10 px-2 py-1 font-mono text-xs"
                          />
                        ) : (
                          user.email
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        {editing ? (
                          <select
                            value={editDraft.role}
                            disabled={isPrimary}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                role: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-navy/10 px-2 py-1 text-sm"
                          >
                            {roleOptions.map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          roleName(user.role)
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={
                            user.status === "active"
                              ? "text-navy"
                              : user.status === "invited"
                                ? "text-slack-blue"
                                : "text-coral"
                          }
                        >
                          {STATUS_LABEL[user.status] ?? user.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-muted">
                        {formatDate(user.lastActiveAt)}
                      </td>
                      <td className="py-3 pr-3 text-muted">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() =>
                                  patchUser(
                                    {
                                      id: user.id,
                                      name: editDraft.name,
                                      email: editDraft.email,
                                      role: editDraft.role,
                                    },
                                    "User updated.",
                                  )
                                }
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-navy hover:bg-mist"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-mist"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => {
                                  setEditingId(user.id);
                                  setEditDraft({
                                    name: user.name,
                                    email: user.email,
                                    role: user.role,
                                  });
                                }}
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-navy hover:bg-mist"
                              >
                                Edit
                              </button>
                              {user.status === "suspended" ||
                              user.status === "deactivated" ? (
                                <button
                                  type="button"
                                  disabled={pending || isPrimary}
                                  onClick={() =>
                                    patchUser(
                                      { id: user.id, status: "active" },
                                      "User reactivated.",
                                    )
                                  }
                                  className="rounded-lg px-2 py-1 text-xs font-semibold text-navy hover:bg-mist"
                                >
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={pending || isPrimary}
                                  onClick={() =>
                                    patchUser(
                                      { id: user.id, status: "suspended" },
                                      "User suspended.",
                                    )
                                  }
                                  className="rounded-lg px-2 py-1 text-xs font-semibold text-coral hover:bg-coral/10"
                                >
                                  Suspend
                                </button>
                              )}
                              {(user.status === "invited" ||
                                user.status === "active") && (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() =>
                                    patchUser({
                                      id: user.id,
                                      action: "resend_invite",
                                    })
                                  }
                                  className="rounded-lg px-2 py-1 text-xs font-semibold text-navy hover:bg-mist"
                                >
                                  Resend invite
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={pending || isPrimary}
                                onClick={() => deactivateUser(user.id)}
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-coral hover:bg-coral/10 disabled:opacity-40"
                              >
                                Deactivate
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No users match filters.</p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="label-mono mb-2">Roles</p>
            <ul className="space-y-1">
              {roles.map((role) => (
                <li key={role.key}>
                  <button
                    type="button"
                    onClick={() => selectRole(role)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm ${selectedRoleKey === role.key ? "bg-navy text-white" : "bg-mist/50 text-ink hover:bg-mist"}`}
                  >
                    <span className="font-semibold">{role.name}</span>
                    <span
                      className={`mt-0.5 block text-xs ${selectedRoleKey === role.key ? "text-white/70" : "text-muted"}`}
                    >
                      {role.isSystem ? "System" : "Custom"} · {role.userCount}{" "}
                      users
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <form
              onSubmit={createRole}
              className="mt-4 space-y-2 rounded-xl border border-navy/8 bg-mist/30 p-3"
            >
              <p className="text-sm font-semibold text-ink">New custom role</p>
              <input
                required
                placeholder="Key (e.g. bid_lead)"
                value={newRole.key}
                onChange={(e) =>
                  setNewRole((r) => ({ ...r, key: e.target.value }))
                }
                className="w-full rounded-lg border border-navy/10 px-2 py-1.5 font-mono text-xs"
              />
              <input
                required
                placeholder="Display name"
                value={newRole.name}
                onChange={(e) =>
                  setNewRole((r) => ({ ...r, name: e.target.value }))
                }
                className="w-full rounded-lg border border-navy/10 px-2 py-1.5 text-sm"
              />
              <textarea
                placeholder="Description"
                value={newRole.description}
                onChange={(e) =>
                  setNewRole((r) => ({ ...r, description: e.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-navy/10 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold disabled:opacity-60 text-white"
              >
                Create role
              </button>
            </form>
          </div>

          {selectedRole ? (
            <div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="label-mono">Name</span>
                  <input
                    value={roleDraft.name}
                    onChange={(e) =>
                      setRoleDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-navy/10 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="label-mono">Description</span>
                  <textarea
                    value={roleDraft.description}
                    onChange={(e) =>
                      setRoleDraft((d) => ({
                        ...d,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                    className="mt-1.5 w-full rounded-xl border border-navy/10 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <p className="label-mono mt-5 mb-2">Permissions matrix</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-navy/10 text-muted">
                      <th className="py-2 pr-3 font-semibold">Module</th>
                      {(
                        [
                          "view",
                          "create",
                          "edit",
                          "delete",
                          "approve",
                          "export",
                        ] as PermissionAction[]
                      ).map((action) => (
                        <th key={action} className="px-2 py-2 font-semibold">
                          {ACTION_LABELS[action]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => (
                      <tr key={mod.key} className="border-b border-navy/5">
                        <td className="py-2 pr-3 font-semibold text-ink">
                          {MODULE_LABELS[mod.key]}
                        </td>
                        {(
                          [
                            "view",
                            "create",
                            "edit",
                            "delete",
                            "approve",
                            "export",
                          ] as PermissionAction[]
                        ).map((action) => {
                          const applies = mod.actions.includes(action);
                          const allowed = roleDraft.permissions.some(
                            (p) =>
                              p.module === mod.key &&
                              p.action === action &&
                              p.allowed,
                          );
                          return (
                            <td key={action} className="px-2 py-2 text-center">
                              {applies ? (
                                <input
                                  type="checkbox"
                                  checked={allowed}
                                  onChange={() => togglePerm(mod.key, action)}
                                  aria-label={`${mod.label} ${action}`}
                                />
                              ) : (
                                <span className="text-muted/40">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={saveRoleMatrix}
                  className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save role"}
                </button>
                {!selectedRole.isSystem ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete custom role “${selectedRole.name}”?`,
                        )
                      ) {
                        return;
                      }
                      startTransition(async () => {
                        const res = await fetch("/api/settings/roles", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ key: selectedRole.key }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setError(data.error ?? "Could not delete role.");
                          return;
                        }
                        setSelectedRoleKey(null);
                        setNotice("Role deleted.");
                        await loadAll();
                      });
                    }}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-coral hover:bg-coral/10"
                  >
                    Delete role
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Select a role to edit.</p>
          )}
        </div>
      )}
    </section>
  );
}
