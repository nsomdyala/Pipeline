"use client";

import { useEffect, useState, useTransition } from "react";
import { ProfileAvatarCard } from "@/components/settings/profile-avatar-card";
import { Avatar } from "@/components/ui/avatar";
import { OPP_LANES, type OppLane } from "@/lib/opportunities/types";
import {
  USER_ROLES,
  type AppUser,
  type CompanyProfile,
  type PortalWatchItem,
  type SettingsBundle,
  type UserRole,
} from "@/lib/settings/types";

type CategoryRow = {
  etendersCategory: string;
  lane: Exclude<OppLane, "Other">;
};

const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  member: "Bid team member",
  viewer: "Viewer",
};

const emptyUser = {
  name: "",
  email: "",
  role: "member" as UserRole,
  password: "",
};

export function SettingsBoard() {
  const [settings, setSettings] = useState<SettingsBundle | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [userForm, setUserForm] = useState(emptyUser);
  const [showAddUser, setShowAddUser] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userNotice, setUserNotice] = useState<string | null>(null);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [categorySaved, setCategorySaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => r.json())
      .then((d: SettingsBundle) => {
        setSettings(d);
        setCompany(d.company);
        setCategoryRows(
          (d.categoryLaneMap ?? []).map((row) => ({
            etendersCategory: row.etendersCategory,
            lane: row.lane,
          })),
        );
      });
  }, []);

  function saveCategories(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/settings/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryLaneMap: categoryRows,
          defaultEtendersCategories: categoryRows.map((r) => r.etendersCategory),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error ?? "Could not save categories.");
        return;
      }
      setSettings(data);
      setCategorySaved(true);
      window.setTimeout(() => setCategorySaved(false), 2000);
    });
  }

  function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });
      const data = (await res.json()) as SettingsBundle;
      setSettings(data);
      setCompany(data.company);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    });
  }

  function addUser(e: React.FormEvent) {
    e.preventDefault();
    setUserError(null);
    setUserNotice(null);
    if (userForm.password.trim().length < 8) {
      setUserError("Password must be at least 8 characters.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error ?? "Could not add user.");
        return;
      }
      setSettings((prev) =>
        prev && data.users ? { ...prev, users: data.users } : prev,
      );
      setUserNotice(
        data.message ??
          `${userForm.name} can now sign in at /login with the password you set.`,
      );
      setUserForm(emptyUser);
      setShowAddUser(false);
    });
  }

  function changeRole(id: string, role: UserRole) {
    setUserError(null);
    startTransition(async () => {
      const res = await fetch("/api/settings/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error ?? "Could not update role.");
        return;
      }
      setSettings((prev) =>
        prev && data.users ? { ...prev, users: data.users } : prev,
      );
    });
  }

  function saveResetPassword(id: string) {
    setUserError(null);
    setUserNotice(null);
    if (resetPassword.trim().length < 8) {
      setUserError("Password must be at least 8 characters.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/settings/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password: resetPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error ?? "Could not reset password.");
        return;
      }
      setSettings((prev) =>
        prev && data.users ? { ...prev, users: data.users } : prev,
      );
      setUserNotice("Password updated. Share the new password with the user.");
      setResetPasswordFor(null);
      setResetPassword("");
    });
  }

  function removeUser(id: string) {
    setUserError(null);
    setUserNotice(null);
    startTransition(async () => {
      const res = await fetch("/api/settings/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error ?? "Could not remove user.");
        return;
      }
      setSettings((prev) =>
        prev && data.users ? { ...prev, users: data.users } : prev,
      );
    });
  }

  if (!settings || !company) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8">
        <p className="label-mono mb-2">Company</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
          Settings
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Manage your photo, company profile, and team users for Max Attention
          Technologies.
        </p>
      </header>

      <ProfileAvatarCard />

      <form
        onSubmit={saveCompany}
        className="mb-8 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:grid-cols-2 md:p-6"
      >
        <h2 className="md:col-span-2 text-base font-semibold text-ink">
          Company profile
        </h2>
        {(
          [
            ["name", "Legal name"],
            ["tradingAs", "Trading as"],
            ["regNo", "Registration no."],
            ["csdNo", "CSD number"],
            ["vatNo", "VAT number"],
            ["bbbeeLevel", "B-BBEE level"],
            ["email", "Primary email"],
            ["phone", "Phone"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="label-mono">{label}</span>
            <input
              value={company[key]}
              onChange={(e) =>
                setCompany((c) => (c ? { ...c, [key]: e.target.value } : c))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
            />
          </label>
        ))}
        <label className="block md:col-span-2">
          <span className="label-mono">Address</span>
          <input
            value={company.address}
            onChange={(e) =>
              setCompany((c) => (c ? { ...c, address: e.target.value } : c))
            }
            className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
          />
        </label>
        <div className="md:col-span-2 flex items-center justify-end gap-3">
          {saved ? (
            <span className="text-xs font-semibold text-mint">Saved</span>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
          >
            Save profile
          </button>
        </div>
      </form>

      <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Portal users</h2>
            <p className="mt-1 text-sm text-muted">
              Give each teammate their own login. Admins can add users here;
              anyone can also create an account from the sign-in page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddUser((v) => !v);
              setUserError(null);
              setUserNotice(null);
            }}
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
          >
            {showAddUser ? "Cancel" : "Add user"}
          </button>
        </div>

        {showAddUser ? (
          <form
            onSubmit={addUser}
            className="mt-5 grid gap-4 rounded-xl border border-navy/8 bg-mist/30 p-4 md:grid-cols-2"
          >
            <label className="block">
              <span className="label-mono">Full name</span>
              <input
                required
                value={userForm.name}
                onChange={(e) =>
                  setUserForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Thandi Molefe"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm outline-none ring-mint/40 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Email</span>
              <input
                required
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="name@maxattention.tech"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-mono text-sm outline-none ring-mint/40 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Role</span>
              <select
                value={userForm.role}
                onChange={(e) =>
                  setUserForm((f) => ({
                    ...f,
                    role: e.target.value as UserRole,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm outline-none ring-mint/40 focus:ring-2"
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-mono">Temporary password</span>
              <input
                required
                type="text"
                minLength={8}
                value={userForm.password}
                onChange={(e) =>
                  setUserForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="Min. 8 characters — share with them"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-mono text-sm outline-none ring-mint/40 focus:ring-2"
              />
            </label>
            <div className="flex items-end md:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 md:w-auto"
              >
                {pending ? "Adding…" : "Save user"}
              </button>
            </div>
          </form>
        ) : null}

        {userError ? (
          <p className="mt-3 text-sm font-semibold text-coral" role="alert">
            {userError}
          </p>
        ) : null}
        {userNotice ? (
          <p className="mt-3 text-sm font-semibold text-navy" role="status">
            {userNotice}
          </p>
        ) : null}

        <ul className="mt-5 divide-y divide-navy/5">
          {settings.users.map((user: AppUser) => {
            const isPrimary = user.email === "nsomdyala@maxattention.tech";
            const resetting = resetPasswordFor === user.id;
            return (
              <li
                key={user.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={user.name}
                      src={user.avatarUrl}
                      size={36}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {user.name}
                      </p>
                      <p className="font-mono text-xs text-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${user.id}`}>
                      Role for {user.name}
                    </label>
                    <select
                      id={`role-${user.id}`}
                      value={user.role}
                      disabled={pending || isPrimary}
                      onChange={(e) =>
                        changeRole(user.id, e.target.value as UserRole)
                      }
                      className="rounded-xl border border-navy/10 bg-mist/40 px-3 py-2 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2 disabled:opacity-60"
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel[role]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setResetPasswordFor(resetting ? null : user.id);
                        setResetPassword("");
                        setUserError(null);
                      }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-navy hover:bg-mist"
                    >
                      {resetting ? "Cancel" : "Reset password"}
                    </button>
                    <button
                      type="button"
                      disabled={pending || isPrimary}
                      onClick={() => removeUser(user.id)}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-coral hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {resetting ? (
                  <div className="flex flex-col gap-2 rounded-xl bg-mist/40 p-3 sm:flex-row sm:items-end">
                    <label className="block min-w-0 flex-1">
                      <span className="label-mono">New password</span>
                      <input
                        type="text"
                        minLength={8}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-mono text-sm outline-none ring-mint/40 focus:ring-2"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveResetPassword(user.id)}
                      className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Save password
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6">
        <h2 className="text-base font-semibold text-ink">Lane keywords</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {settings.keywords.map((row) => (
            <li key={row.lane} className="rounded-xl bg-mist/50 px-4 py-3">
              <p className="text-sm font-semibold text-ink">{row.lane}</p>
              <p className="mt-1 text-xs text-muted">{row.terms.join(" · ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <form
        onSubmit={saveCategories}
        className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              eTenders category → lane map
            </h2>
            <p className="mt-1 text-sm text-muted">
              Official `tender.category` labels that feed the Opportunities board
              defaults. Add rows here — no code change needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {categorySaved ? (
              <span className="text-xs font-semibold text-mint">Saved</span>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setCategoryRows((rows) => [
                  ...rows,
                  {
                    etendersCategory: "",
                    lane: "ICT / IS",
                  },
                ])
              }
              className="rounded-xl border border-navy/10 px-3 py-2 text-xs font-semibold text-navy"
            >
              Add category
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-navy disabled:opacity-60"
            >
              Save map
            </button>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {categoryRows.map((row, index) => (
            <li
              key={`${row.etendersCategory}-${index}`}
              className="grid gap-2 md:grid-cols-[1fr_12rem_auto]"
            >
              <input
                value={row.etendersCategory}
                onChange={(e) =>
                  setCategoryRows((rows) =>
                    rows.map((r, i) =>
                      i === index
                        ? { ...r, etendersCategory: e.target.value }
                        : r,
                    ),
                  )
                }
                placeholder="eTenders category label"
                className="rounded-xl border border-navy/10 bg-mist/40 px-3 py-2 text-sm"
              />
              <select
                value={row.lane}
                onChange={(e) =>
                  setCategoryRows((rows) =>
                    rows.map((r, i) =>
                      i === index
                        ? {
                            ...r,
                            lane: e.target.value as Exclude<OppLane, "Other">,
                          }
                        : r,
                    ),
                  )
                }
                className="rounded-xl border border-navy/10 bg-mist/40 px-3 py-2 text-sm"
              >
                {OPP_LANES.filter((l) => l !== "Other").map((lane) => (
                  <option key={lane} value={lane}>
                    {lane}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setCategoryRows((rows) => rows.filter((_, i) => i !== index))
                }
                className="text-xs font-semibold text-coral"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </form>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6">
        <h2 className="text-base font-semibold text-ink">
          Supplier portal watchlist
        </h2>
        <ul className="mt-4 space-y-3">
          {settings.portals.map((portal: PortalWatchItem) => (
            <li key={portal.id}>
              <p className="text-sm font-semibold text-ink">
                {portal.companyName}
              </p>
              <p className="text-xs text-muted">
                {portal.industry} · {portal.registrationStatus}
              </p>
              <a
                href={portal.portalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-mint hover:underline"
              >
                {portal.portalUrl}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
