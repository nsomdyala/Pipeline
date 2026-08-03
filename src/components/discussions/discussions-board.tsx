"use client";

import { useEffect, useState, useTransition } from "react";
import { formatZaDate } from "@/lib/opportunities/dates";
import {
  TOPIC_CATEGORIES,
  type DiscussionTopic,
  type TopicCategory,
} from "@/lib/discussions/types";

export function DiscussionsBoard() {
  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TopicCategory>("Strategy");
  const [body, setBody] = useState("");
  const [linkedTo, setLinkedTo] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/discussions")
      .then((r) => r.json())
      .then((d: { topics: DiscussionTopic[] }) => setTopics(d.topics ?? []))
      .catch(() => setError("Could not load discussions."))
      .finally(() => setLoading(false));
  }, []);

  function createTopic(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, body, linkedTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create topic.");
        return;
      }
      setTopics((prev) => [data.topic, ...prev]);
      setOpen(false);
      setTitle("");
      setBody("");
      setLinkedTo("");
    });
  }

  function reply(topicId: string) {
    const text = replyDrafts[topicId]?.trim();
    if (!text) return;
    startTransition(async () => {
      const res = await fetch(`/api/discussions/${topicId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not reply.");
        return;
      }
      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? data.topic : t)),
      );
      setReplyDrafts((prev) => ({ ...prev, [topicId]: "" }));
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Collaborate</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Discussion forum
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Team forum for strategy, lessons, and product decisions — keep
            threads here so they don’t disappear in chat.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
        >
          {open ? "Cancel" : "Start discussion"}
        </button>
      </header>

      {open ? (
        <form
          onSubmit={createTopic}
          className="mb-8 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:grid-cols-2"
        >
          <label className="md:col-span-2">
            <span className="label-mono">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TopicCategory)}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            >
              {TOPIC_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-mono">Linked to</span>
            <input
              value={linkedTo}
              onChange={(e) => setLinkedTo(e.target.value)}
              placeholder="Opportunity / account ref"
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="md:col-span-2">
            <span className="label-mono">Opening post</span>
            <textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
            >
              Post topic
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="mb-3 text-sm font-semibold text-coral">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted">Loading forum…</p>
      ) : null}

      {!loading && topics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-ink">No discussions yet</p>
          <p className="mt-2 text-sm text-muted">
            Start a topic so the team can capture decisions and lessons.
          </p>
        </div>
      ) : null}

      <ul className="space-y-4">
        {topics.map((topic) => (
          <li
            key={topic.id}
            className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
          >
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                {topic.category}
              </span>
              {topic.pinned ? (
                <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold text-navy">
                  Pinned
                </span>
              ) : null}
              {topic.solved ? (
                <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                  Solved
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 text-lg font-semibold text-ink">{topic.title}</h2>
            <p className="mt-1 text-sm text-muted">
              {topic.authorName}
              {topic.linkedTo ? ` · ${topic.linkedTo}` : ""} ·{" "}
              {formatZaDate(topic.updatedAt)}
            </p>
            <p className="mt-3 text-sm text-ink/85">{topic.body}</p>
            {topic.posts.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-navy/5 pt-3">
                {topic.posts.map((post) => (
                  <li key={post.id} className="text-sm">
                    <span className="font-semibold text-ink">{post.authorName}</span>
                    <span className="ml-2 font-mono text-xs text-muted">
                      {formatZaDate(post.createdAt)}
                    </span>
                    <p className="mt-1 text-ink/80">{post.body}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex gap-2">
              <input
                value={replyDrafts[topic.id] ?? ""}
                onChange={(e) =>
                  setReplyDrafts((prev) => ({
                    ...prev,
                    [topic.id]: e.target.value,
                  }))
                }
                placeholder="Write a reply…"
                className="min-w-0 flex-1 rounded-xl border border-navy/10 bg-mist/40 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => reply(topic.id)}
                className="rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-white"
              >
                Reply
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
