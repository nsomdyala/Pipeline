"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { openLiveChat } from "@/components/chat/live-chat-rail";
import { formatZaDate, formatZar } from "@/lib/opportunities/dates";
import {
  IDEA_CATEGORIES,
  IDEA_STATUS_LABELS,
  IDEA_STATUSES,
  type Idea,
  type IdeaCategory,
  type IdeaStatus,
} from "@/lib/ideas/types";
function avgScore(idea: Idea): number | null {
  const scores = idea.reviews
    .map((r) => r.score)
    .filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function StatusPill({ status }: { status: IdeaStatus }) {
  const tone =
    status === "rejected"
      ? "pill-overdue"
      : status === "parked"
        ? ""
        : status === "in_rd" || status === "approved"
          ? "pill-live"
          : status === "under_review"
            ? "pill-warning"
            : "pill-info";
  return (
    <span className={`pill ${tone}`}>{IDEA_STATUS_LABELS[status]}</span>
  );
}

export function IdeasRegisterBoard({ role }: { role: string }) {
  const canDecide = role === "admin";
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "cards">("cards");
  const [status, setStatus] = useState<IdeaStatus | "">("");
  const [category, setCategory] = useState("");
  const [submitter, setSubmitter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    title: "",
    description: "",
    problem: "",
    potentialValue: "",
    potentialValueZar: "",
    category: "ICT / IS" as IdeaCategory,
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewScore, setReviewScore] = useState("4");
  const [decisionReason, setDecisionReason] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const statusRaw = params.get("status") ?? "";
    if (IDEA_STATUSES.includes(statusRaw as IdeaStatus)) {
      setStatus(statusRaw as IdeaStatus);
    }
    const cat = params.get("category") ?? "";
    if (cat) setCategory(cat);
    const sub = params.get("submitter") ?? "";
    if (sub) setSubmitter(sub);
    const highlight = params.get("highlight");
    if (highlight) setSelectedId(highlight);
  }, []);

  function load() {
    startTransition(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (category) params.set("category", category);
        if (submitter.trim()) params.set("submitter", submitter.trim());
        const qs = params.toString();
        const res = await fetch(`/api/ideas${qs ? `?${qs}` : ""}`);
        const data = (await res.json()) as { ideas?: Idea[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load ideas.");
        setIdeas(data.ideas ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load ideas.");
      } finally {
        setLoading(false);
      }
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on filter change
  }, [status, category, submitter]);

  const selected = useMemo(
    () => ideas.find((i) => i.id === selectedId) ?? null,
    [ideas, selectedId],
  );

  const submitters = useMemo(() => {
    return Array.from(new Set(ideas.map((i) => i.submitterName)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [ideas]);

  async function submitIdea(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const body = new FormData();
    body.set("title", form.title);
    body.set("description", form.description);
    body.set("problem", form.problem);
    body.set("potentialValue", form.potentialValue);
    if (form.potentialValueZar.trim()) {
      body.set("potentialValueZar", form.potentialValueZar.trim());
    }
    body.set("category", form.category);
    if (files) {
      Array.from(files).forEach((f) => body.append("files", f));
    }
    const res = await fetch("/api/ideas", { method: "POST", body });
    const data = (await res.json()) as { idea?: Idea; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not submit idea.");
      return;
    }
    setForm({
      title: "",
      description: "",
      problem: "",
      potentialValue: "",
      potentialValueZar: "",
      category: "ICT / IS",
    });
    setFiles(null);
    if (data.idea) {
      setIdeas((prev) => [data.idea!, ...prev]);
      setSelectedId(data.idea.id);
    }
  }

  async function postReview() {
    if (!selected) return;
    const res = await fetch(`/api/ideas/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "review",
        comment: reviewComment,
        score: reviewScore ? Number(reviewScore) : null,
      }),
    });
    const data = (await res.json()) as { idea?: Idea; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not save review.");
      return;
    }
    if (data.idea) {
      setIdeas((prev) =>
        prev.map((i) => (i.id === data.idea!.id ? data.idea! : i)),
      );
      setReviewComment("");
    }
  }

  async function decide(decision: "approve" | "reject" | "park" | "under_review") {
    if (!selected) return;
    const res = await fetch(`/api/ideas/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "decide",
        decision,
        reason: decisionReason,
      }),
    });
    const data = (await res.json()) as {
      idea?: Idea;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Could not update decision.");
      return;
    }
    if (data.idea) {
      setIdeas((prev) =>
        prev.map((i) => (i.id === data.idea!.id ? data.idea! : i)),
      );
      setDecisionReason("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Ideas & R&D</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
            Ideas register
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Capture ideas, run team review, then approve into Research &
            Development or park with a reason.
          </p>
        </div>
        <Link
          href="/rd"
          className="text-sm font-semibold text-mint hover:underline"
        >
          Open R&D board →
        </Link>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={submitIdea}
        className="mb-8 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-ink">Register an idea</h2>
        </div>
        <label className="text-xs md:col-span-2">
          <span className="label-mono">Title</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs md:col-span-2">
          <span className="label-mono">Description</span>
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs md:col-span-2">
          <span className="label-mono">Problem it solves</span>
          <textarea
            required
            rows={2}
            value={form.problem}
            onChange={(e) => setForm((f) => ({ ...f, problem: e.target.value }))}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="label-mono">Potential value / opportunity</span>
          <input
            value={form.potentialValue}
            onChange={(e) =>
              setForm((f) => ({ ...f, potentialValue: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="label-mono">Est. value (ZAR)</span>
          <input
            type="number"
            min={0}
            step={1000}
            value={form.potentialValueZar}
            onChange={(e) =>
              setForm((f) => ({ ...f, potentialValueZar: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="label-mono">Category (lane)</span>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as IdeaCategory,
              }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-3 py-2 text-sm"
          >
            {IDEA_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="label-mono">Attachments</span>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="mt-1 w-full text-sm"
          />
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            Submit idea
          </button>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="label-mono">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as IdeaStatus | "")}
            className="mt-1 block rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {IDEA_STATUSES.map((s) => (
              <option key={s} value={s}>
                {IDEA_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="label-mono">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {IDEA_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="label-mono">Submitter</span>
          <select
            value={submitter}
            onChange={(e) => setSubmitter(e.target.value)}
            className="mt-1 block rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {submitters.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-1 rounded-[var(--radius-md)] bg-navy/5 p-1">
          <button
            type="button"
            className={`rounded px-2 py-1 text-xs font-semibold ${view === "cards" ? "bg-white text-ink shadow-sm" : "text-muted"}`}
            onClick={() => setView("cards")}
          >
            Cards
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 text-xs font-semibold ${view === "list" ? "bg-white text-ink shadow-sm" : "text-muted"}`}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {loading && ideas.length === 0 ? (
            <p className="text-sm text-muted">Loading ideas…</p>
          ) : ideas.length === 0 ? (
            <p className="text-sm text-muted">No ideas match these filters.</p>
          ) : view === "cards" ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {ideas.map((idea) => {
                const score = avgScore(idea);
                return (
                  <li key={idea.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(idea.id)}
                      className={`w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition hover:opacity-95 ${selectedId === idea.id ? "ring-mint" : "ring-navy/5"}`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <StatusPill status={idea.status} />
                        <span className="text-[0.7rem] text-muted">
                          {formatZaDate(idea.createdAt)}
                        </span>
                      </div>
                      <div className="font-semibold text-ink">{idea.title}</div>
                      <div className="mt-1 text-xs text-muted">
                        {idea.category} · {idea.submitterName}
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm text-muted">
                        {idea.description}
                      </div>
                      <div className="mt-3 flex justify-between text-xs text-muted">
                        <span>{formatZar(idea.potentialValueZar)}</span>
                        <span>
                          {score == null ? "No score" : `${score.toFixed(1)}/5`}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-navy/5">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--slack-border)] text-xs text-muted">
                    <th className="px-4 py-3 font-medium">Idea</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Submitter</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ideas.map((idea) => (
                    <tr
                      key={idea.id}
                      className={`cursor-pointer border-b border-[var(--slack-border)]/70 last:border-0 ${selectedId === idea.id ? "bg-mint/5" : ""}`}
                      onClick={() => setSelectedId(idea.id)}
                    >
                      <td className="px-4 py-3 font-medium text-ink">
                        {idea.title}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={idea.status} />
                      </td>
                      <td className="px-4 py-3 text-muted">{idea.category}</td>
                      <td className="px-4 py-3 text-muted">
                        {idea.submitterName}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatZaDate(idea.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          {!selected ? (
            <p className="text-sm text-muted">
              Select an idea to review, discuss, or decide.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <StatusPill status={selected.status} />
                <h2 className="mt-2 text-lg font-semibold text-ink">
                  {selected.title}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {selected.submitterName} · {formatZaDate(selected.createdAt)} ·{" "}
                  {selected.category}
                </p>
              </div>
              <p className="text-sm text-ink">{selected.description}</p>
              <div>
                <div className="label-mono">Problem</div>
                <p className="mt-1 text-sm text-muted">{selected.problem}</p>
              </div>
              <div>
                <div className="label-mono">Potential value</div>
                <p className="mt-1 text-sm text-muted">
                  {selected.potentialValue || "—"}
                  {selected.potentialValueZar != null
                    ? ` · ${formatZar(selected.potentialValueZar)}`
                    : ""}
                </p>
              </div>
              {selected.attachments.length > 0 ? (
                <div>
                  <div className="label-mono">Attachments</div>
                  <ul className="mt-1 space-y-1 text-sm text-muted">
                    {selected.attachments.map((f) => (
                      <li key={f.id}>{f.filename}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selected.decisionReason ? (
                <div className="rounded-lg bg-navy/5 px-3 py-2 text-sm">
                  <div className="label-mono">Decision</div>
                  <p className="mt-1 text-muted">{selected.decisionReason}</p>
                  {selected.decidedByName ? (
                    <p className="mt-1 text-xs text-muted">
                      {selected.decidedByName}
                      {selected.decidedAt
                        ? ` · ${formatZaDate(selected.decidedAt)}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="label-mono">Reviews</div>
                  {selected.channelId ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-mint hover:underline"
                      onClick={() => openLiveChat(selected.channelId!)}
                    >
                      Open discussion
                    </button>
                  ) : null}
                </div>
                <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto">
                  {selected.reviews.length === 0 ? (
                    <li className="text-sm text-muted">No reviews yet.</li>
                  ) : (
                    selected.reviews.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-lg bg-navy/[0.03] px-3 py-2 text-sm"
                      >
                        <div className="flex justify-between gap-2 text-xs text-muted">
                          <span>{r.userName}</span>
                          <span>
                            {r.score != null ? `${r.score}/5 · ` : ""}
                            {formatZaDate(r.createdAt)}
                          </span>
                        </div>
                        {r.comment ? (
                          <p className="mt-1 text-ink">{r.comment}</p>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
                <label className="text-xs">
                  <span className="label-mono">Comment</span>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="mt-2 block text-xs">
                  <span className="label-mono">Score (1–5)</span>
                  <select
                    value={reviewScore}
                    onChange={(e) => setReviewScore(e.target.value)}
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                  >
                    <option value="">No score</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost mt-2"
                  onClick={() => void postReview()}
                >
                  Add review
                </button>
              </div>

              {canDecide &&
              selected.status !== "in_rd" &&
              selected.status !== "rejected" &&
              selected.status !== "parked" ? (
                <div className="border-t border-[var(--slack-border)] pt-4">
                  <div className="label-mono mb-2">Team decision</div>
                  <label className="text-xs">
                    <span className="label-mono">Reason (required to reject/park)</span>
                    <textarea
                      rows={2}
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] px-2 py-1.5 text-sm"
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.status === "submitted" ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void decide("under_review")}
                      >
                        Mark under review
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void decide("approve")}
                    >
                      Approve → R&D
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost text-coral"
                      onClick={() => void decide("reject")}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => void decide("park")}
                    >
                      Park
                    </button>
                  </div>
                </div>
              ) : null}

              {selected.rdItemId ? (
                <Link
                  href={`/rd?highlight=${selected.rdItemId}`}
                  className="inline-block text-sm font-semibold text-mint hover:underline"
                >
                  View R&D item →
                </Link>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
