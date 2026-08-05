"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { formatZaDate, zaCalendarDate } from "@/lib/opportunities/dates";
import {
  RD_PRIORITY_LABELS,
  RD_PRIORITIES,
  RD_STAGE_LABELS,
  RD_STAGES,
  type RdItem,
  type RdPriority,
  type RdStage,
} from "@/lib/ideas/types";

function isOverdue(item: RdItem, today: string): boolean {
  if (!item.targetDate) return false;
  if (item.stage === "completed" || item.stage === "shelved") return false;
  return zaCalendarDate(item.targetDate) < today;
}

function flagged(item: RdItem, today: string): boolean {
  return item.atRisk || isOverdue(item, today);
}

export function RdBoard() {
  const [items, setItems] = useState<RdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<RdStage | "">("");
  const [assignee, setAssignee] = useState("");
  const [atRiskOnly, setAtRiskOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activityNote, setActivityNote] = useState("");
  const [edit, setEdit] = useState({
    stage: "" as RdStage | "",
    priority: "" as RdPriority | "",
    ownerName: "",
    targetDate: "",
    effortNotes: "",
    progressNotes: "",
    atRisk: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const stageRaw = params.get("stage") ?? "";
    if (RD_STAGES.includes(stageRaw as RdStage)) {
      setStage(stageRaw as RdStage);
    }
    if (params.get("atRisk") === "1") setAtRiskOnly(true);
    const highlight = params.get("highlight");
    if (highlight) setSelectedId(highlight);
  }, []);

  function load() {
    startTransition(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (stage) params.set("stage", stage);
        if (assignee.trim()) params.set("assignee", assignee.trim());
        if (atRiskOnly) params.set("atRisk", "1");
        const qs = params.toString();
        const res = await fetch(`/api/rd${qs ? `?${qs}` : ""}`);
        const data = (await res.json()) as { items?: RdItem[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load R&D.");
        setItems(data.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load R&D.");
      } finally {
        setLoading(false);
      }
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, assignee, atRiskOnly]);

  const today = zaCalendarDate(new Date());
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setEdit({
      stage: selected.stage,
      priority: selected.priority,
      ownerName: selected.ownerName,
      targetDate: selected.targetDate
        ? zaCalendarDate(selected.targetDate)
        : "",
      effortNotes: selected.effortNotes,
      progressNotes: selected.progressNotes,
      atRisk: selected.atRisk,
    });
  }, [selected]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(
      RD_STAGES.map((s) => [s, [] as RdItem[]]),
    ) as Record<RdStage, RdItem[]>;
    for (const item of items) {
      map[item.stage]?.push(item);
    }
    return map;
  }, [items]);

  const assignees = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.ownerName) names.add(item.ownerName);
      for (const a of item.assignments) names.add(a.userName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [items]);

  async function saveSelected() {
    if (!selected) return;
    const res = await fetch(`/api/rd/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        stage: edit.stage || undefined,
        priority: edit.priority || undefined,
        ownerName: edit.ownerName,
        targetDate: edit.targetDate
          ? new Date(`${edit.targetDate}T12:00:00+02:00`).toISOString()
          : null,
        effortNotes: edit.effortNotes,
        progressNotes: edit.progressNotes,
        atRisk: edit.atRisk,
      }),
    });
    const data = (await res.json()) as { item?: RdItem; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not update item.");
      return;
    }
    if (data.item) {
      setItems((prev) =>
        prev.map((i) => (i.id === data.item!.id ? data.item! : i)),
      );
    }
  }

  async function postActivity() {
    if (!selected || !activityNote.trim()) return;
    const res = await fetch(`/api/rd/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activity", body: activityNote }),
    });
    const data = (await res.json()) as { item?: RdItem; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not add activity.");
      return;
    }
    if (data.item) {
      setItems((prev) =>
        prev.map((i) => (i.id === data.item!.id ? data.item! : i)),
      );
      setActivityNote("");
    }
  }

  async function moveStage(item: RdItem, next: RdStage) {
    const res = await fetch(`/api/rd/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", stage: next }),
    });
    const data = (await res.json()) as { item?: RdItem; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not move item.");
      return;
    }
    if (data.item) {
      setItems((prev) =>
        prev.map((i) => (i.id === data.item!.id ? data.item! : i)),
      );
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Ideas & R&D</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
            Research & Development
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Approved ideas tracked from backlog through validation. Overdue and
            at-risk items are flagged in coral.
          </p>
        </div>
        <Link
          href="/ideas"
          className="text-sm font-semibold text-mint hover:underline"
        >
          ← Ideas register
        </Link>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="label-mono">Stage</span>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as RdStage | "")}
            className="mt-1 block rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All stages</option>
            {RD_STAGES.map((s) => (
              <option key={s} value={s}>
                {RD_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="label-mono">Assignee</span>
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="mt-1 block rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Anyone</option>
            {assignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={atRiskOnly}
            onChange={(e) => setAtRiskOnly(e.target.checked)}
          />
          Overdue / at-risk only
        </label>
      </div>

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted">Loading R&D board…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {RD_STAGES.map((s) => (
              <div
                key={s}
                className="w-[240px] shrink-0 rounded-2xl bg-navy/[0.03] p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink">
                    {RD_STAGE_LABELS[s]}
                  </h2>
                  <span className="font-mono text-xs text-muted">
                    {byStage[s].length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {byStage[s].map((item) => {
                    const danger = flagged(item, today);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`w-full rounded-xl bg-white p-3 text-left shadow-sm ring-1 transition ${
                            selectedId === item.id
                              ? "ring-mint"
                              : danger
                                ? "ring-coral/40"
                                : "ring-navy/5"
                          }`}
                        >
                          <div
                            className={`text-sm font-semibold ${danger ? "text-coral" : "text-ink"}`}
                          >
                            {item.title}
                          </div>
                          <div className="mt-1 text-[0.7rem] text-muted">
                            {item.ownerName || "Unassigned"} ·{" "}
                            {RD_PRIORITY_LABELS[item.priority]}
                          </div>
                          <div
                            className={`mt-1 text-[0.7rem] ${danger ? "font-semibold text-coral" : "text-muted"}`}
                          >
                            {item.targetDate
                              ? `Due ${formatZaDate(item.targetDate)}`
                              : "No target date"}
                            {item.atRisk ? " · At risk" : ""}
                            {isOverdue(item, today) ? " · Overdue" : ""}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {RD_STAGES.filter((ns) => ns !== item.stage)
                              .slice(0, 2)
                              .map((ns) => (
                                <button
                                  key={ns}
                                  type="button"
                                  className="rounded bg-navy/5 px-1.5 py-0.5 text-[0.65rem] text-muted hover:bg-navy/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void moveStage(item, ns);
                                  }}
                                  disabled={pending}
                                >
                                  → {RD_STAGE_LABELS[ns]}
                                </button>
                              ))}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
            {!selected ? (
              <p className="text-sm text-muted">
                Select an R&D item to update ownership, dates, and activity.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="label-mono">Originating idea</div>
                  <Link
                    href={`/ideas?highlight=${selected.ideaId}`}
                    className="mt-1 inline-block text-sm font-semibold text-mint hover:underline"
                  >
                    {selected.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    Submitted by {selected.submitterName}
                    {selected.approvedByName
                      ? ` · Approved by ${selected.approvedByName}`
                      : ""}
                    {selected.approvedAt
                      ? ` · ${formatZaDate(selected.approvedAt)}`
                      : ""}
                  </p>
                </div>

                <label className="block text-xs">
                  <span className="label-mono">Stage</span>
                  <select
                    value={edit.stage}
                    onChange={(e) =>
                      setEdit((f) => ({
                        ...f,
                        stage: e.target.value as RdStage,
                      }))
                    }
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  >
                    {RD_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {RD_STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="label-mono">Priority</span>
                  <select
                    value={edit.priority}
                    onChange={(e) =>
                      setEdit((f) => ({
                        ...f,
                        priority: e.target.value as RdPriority,
                      }))
                    }
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  >
                    {RD_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {RD_PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="label-mono">Owner</span>
                  <input
                    value={edit.ownerName}
                    onChange={(e) =>
                      setEdit((f) => ({ ...f, ownerName: e.target.value }))
                    }
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="label-mono">Target date</span>
                  <input
                    type="date"
                    value={edit.targetDate}
                    onChange={(e) =>
                      setEdit((f) => ({ ...f, targetDate: e.target.value }))
                    }
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="label-mono">Effort / notes</span>
                  <textarea
                    rows={2}
                    value={edit.effortNotes}
                    onChange={(e) =>
                      setEdit((f) => ({ ...f, effortNotes: e.target.value }))
                    }
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="label-mono">Progress notes</span>
                  <textarea
                    rows={2}
                    value={edit.progressNotes}
                    onChange={(e) =>
                      setEdit((f) => ({ ...f, progressNotes: e.target.value }))
                    }
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={edit.atRisk}
                    onChange={(e) =>
                      setEdit((f) => ({ ...f, atRisk: e.target.checked }))
                    }
                  />
                  Flag at-risk
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void saveSelected()}
                  disabled={pending}
                >
                  Save changes
                </button>

                <div className="border-t border-[var(--slack-border)] pt-3">
                  <div className="label-mono mb-2">Team</div>
                  <ul className="space-y-1 text-sm text-muted">
                    {selected.assignments.map((a) => (
                      <li key={a.id}>{a.userName}</li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-[var(--slack-border)] pt-3">
                  <div className="label-mono mb-2">Activity</div>
                  <ul className="mb-2 max-h-40 space-y-2 overflow-y-auto">
                    {[...selected.activity].reverse().map((a) => (
                      <li key={a.id} className="text-sm">
                        <div className="text-xs text-muted">
                          {a.authorName} · {formatZaDate(a.createdAt)}
                        </div>
                        <p className="text-ink">{a.body}</p>
                      </li>
                    ))}
                  </ul>
                  <textarea
                    rows={2}
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    placeholder="Add progress note…"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost mt-2"
                    onClick={() => void postActivity()}
                  >
                    Log activity
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
