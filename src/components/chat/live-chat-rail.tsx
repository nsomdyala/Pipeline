"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { Channel, ChatMessage } from "@/lib/chat/types";

const STORAGE_KEY = "pipeline.chatRailOpen";
const OPEN_EVENT = "pipeline:open-chat";

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return new Intl.DateTimeFormat("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Johannesburg",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

export function openLiveChat() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function LiveChatRail({
  authorName,
  authorAvatarUrl = null,
}: {
  authorName: string;
  authorAvatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [livePulse, setLivePulse] = useState(false);
  const [avatarByName, setAvatarByName] = useState<Record<string, string | null>>(
    {},
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);
  const active = channels.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "0") {
        setOpen(false);
        return;
      }
      if (stored === "1") {
        setOpen(true);
        return;
      }
      // Default open on desktop, collapsed on smaller screens
      setOpen(window.matchMedia("(min-width: 1100px)").matches);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function loadChannels() {
    const res = await fetch("/api/chat/channels");
    const data = (await res.json()) as {
      channels?: Channel[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "Could not load channels.");
    }
    setChannels(data.channels ?? []);
    setError(null);
    setActiveId((current) => {
      if (current && (data.channels ?? []).some((c) => c.id === current)) {
        return current;
      }
      return (
        data.channels?.find((c) => c.name === "general")?.id ??
        data.channels?.[0]?.id ??
        null
      );
    });
  }

  async function loadMessages(channelId: string, soft = false) {
    const res = await fetch(`/api/chat/channels/${channelId}/messages`);
    const data = (await res.json()) as {
      messages?: ChatMessage[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "Could not load messages.");
    }
    setMessages(data.messages ?? []);
    if (!soft) setError(null);
    if (soft && (data.messages?.length ?? 0) > lastCountRef.current) {
      setLivePulse(true);
      window.setTimeout(() => setLivePulse(false), 1200);
    }
    lastCountRef.current = data.messages?.length ?? 0;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadChannels();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load chat.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authorAvatarUrl) {
      setAvatarByName((prev) => ({ ...prev, [authorName]: authorAvatarUrl }));
    }
  }, [authorName, authorAvatarUrl]);

  useEffect(() => {
    const names = [
      ...new Set(messages.map((m) => m.authorName).filter(Boolean)),
    ];
    const missing = names.filter((n) => !(n in avatarByName));
    if (missing.length === 0) return;
    let cancelled = false;
    void fetch(
      `/api/avatars/lookup?names=${encodeURIComponent(missing.join("|"))}`,
    )
      .then((r) => r.json())
      .then((d: { avatars?: Record<string, string | null> }) => {
        if (cancelled || !d.avatars) return;
        setAvatarByName((prev) => ({ ...prev, ...d.avatars }));
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when messages change
  }, [messages]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    lastCountRef.current = 0;
    (async () => {
      try {
        await loadMessages(activeId);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load messages.",
          );
        }
      }
    })();

    const timer = window.setInterval(() => {
      void loadMessages(activeId, true).catch(() => undefined);
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeId]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId, open]);

  function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId || !draft.trim()) return;
    setError(null);
    const body = draft.trim();
    setDraft("");

    startTransition(async () => {
      try {
        const res = await fetch(`/api/chat/channels/${activeId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, authorName }),
        });
        const data = (await res.json()) as {
          message?: ChatMessage;
          error?: string;
        };
        if (!res.ok || !data.message) {
          throw new Error(data.error ?? "Could not send message.");
        }
        setMessages((prev) =>
          prev.some((m) => m.id === data.message!.id)
            ? prev
            : [...prev, data.message!],
        );
        lastCountRef.current += 1;
      } catch (err) {
        setDraft(body);
        setError(err instanceof Error ? err.message : "Could not send.");
      }
    });
  }

  if (!open) {
    return (
      <div className="relative z-20 flex h-full shrink-0 flex-col items-center border-l border-navy/8 bg-white">
        <button
          type="button"
          onClick={toggleOpen}
          className="flex h-full w-11 flex-col items-center gap-3 px-2 py-4 text-muted transition hover:bg-mist hover:text-ink"
          aria-label="Open live chat"
          title="Open live chat"
        >
          <span
            className={`mt-1 size-2 rounded-full ${
              livePulse ? "bg-mint shadow-[0_0_0_4px_rgba(31,199,156,0.25)]" : "bg-mint"
            }`}
          />
          <span
            className="label-mono text-[0.625rem] text-inherit"
            style={{ writingMode: "vertical-rl" }}
          >
            Live chat
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`live-chat-rail relative z-20 flex h-full w-[min(22rem,100vw)] shrink-0 flex-col border-l border-navy/8 bg-white ${
        livePulse ? "live-chat-pulse" : ""
      }`}
      aria-label="Live team chat"
    >
      <header className="flex items-start justify-between gap-2 border-b border-navy/8 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-mint" />
            </span>
            <p className="text-sm font-semibold tracking-[-0.02em] text-ink">
              Live chat
            </p>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Visible on every page · history kept
          </p>
        </div>
        <button
          type="button"
          onClick={toggleOpen}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-mist hover:text-ink"
          aria-label="Collapse live chat"
        >
          Hide
        </button>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-navy/8 px-2 py-2">
        {loading ? (
          <span className="px-2 text-xs text-muted">Loading…</span>
        ) : (
          channels.map((channel) => {
            const selected = channel.id === activeId;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => setActiveId(channel.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs transition ${
                  selected
                    ? "bg-mint/15 font-semibold text-navy"
                    : "text-muted hover:bg-mist hover:text-ink"
                }`}
              >
                <span className="font-mono">#</span>
                {channel.name}
              </button>
            );
          })
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {!active && !loading ? (
          <p className="text-sm text-muted">Select a channel.</p>
        ) : null}
        {active && messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy/15 px-3 py-6 text-center text-xs text-muted">
            No messages yet in #{active.name}.
          </p>
        ) : null}
        {messages.map((message) => (
          <article
            key={message.id}
            className="row-hover -mx-1 flex gap-2.5 rounded-[var(--radius-md)] px-1 py-1.5"
          >
            <Avatar
              name={message.authorName}
              src={avatarByName[message.authorName]}
              size={36}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="truncate text-[0.8125rem] font-bold text-ink">
                  {message.authorName}
                </span>
                <time className="text-[0.7rem] text-muted">
                  {formatTime(message.createdAt)}
                </time>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-ink/90">
                {message.body}
              </p>
            </div>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-navy/8 p-3">
        {error ? (
          <p className="mb-2 text-xs font-semibold text-coral" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-1.5">
          <label className="sr-only" htmlFor="live-chat-draft">
            Message
          </label>
          <input
            id="live-chat-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={active ? `Message #${active.name}` : "Message…"}
            className="field min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim() || !activeId}
            className="btn btn-primary"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
