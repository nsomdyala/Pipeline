"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Channel, ChatMessage } from "@/lib/chat/types";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ChatPanel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const active = channels.find((c) => c.id === activeId) ?? null;

  async function loadChannels(preferId?: string | null) {
    const res = await fetch("/api/chat/channels");
    if (!res.ok) throw new Error("Could not load channels.");
    const data = (await res.json()) as { channels: Channel[] };
    setChannels(data.channels);
    setActiveId((current) => {
      if (preferId && data.channels.some((c) => c.id === preferId)) {
        return preferId;
      }
      if (current && data.channels.some((c) => c.id === current)) {
        return current;
      }
      return (
        data.channels.find((c) => c.name === "general")?.id ??
        data.channels[0]?.id ??
        null
      );
    });
  }

  async function loadMessages(channelId: string) {
    const res = await fetch(`/api/chat/channels/${channelId}/messages`);
    if (!res.ok) throw new Error("Could not load messages.");
    const data = (await res.json()) as { messages: ChatMessage[] };
    setMessages(data.messages);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadChannels();
      } catch {
        if (!cancelled) setError("Could not load chat.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      try {
        await loadMessages(activeId);
      } catch {
        if (!cancelled) setError("Could not load messages.");
      }
    })();

    const timer = window.setInterval(() => {
      void loadMessages(activeId).catch(() => undefined);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

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
          body: JSON.stringify({ body }),
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
      } catch (err) {
        setDraft(body);
        setError(err instanceof Error ? err.message : "Could not send.");
      }
    });
  }

  function createChannel(event: React.FormEvent) {
    event.preventDefault();
    if (!newChannel.trim()) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newChannel }),
        });
        const data = (await res.json()) as {
          channel?: Channel;
          error?: string;
        };
        if (!res.ok || !data.channel) {
          throw new Error(data.error ?? "Could not create channel.");
        }
        setNewChannel("");
        await loadChannels(data.channel.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create channel.");
      }
    });
  }

  return (
    <div className="absolute inset-0 grid grid-cols-[15rem_minmax(0,1fr)] overflow-hidden bg-mist md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] border-r border-navy/8 bg-white">
        <div className="border-b border-navy/8 px-4 py-3">
          <p className="label-mono">Chat</p>
          <p className="mt-1 text-xs text-muted">Team channels</p>
        </div>
        <div className="px-4 pt-3 pb-1">
          <p className="label-mono">Channels</p>
        </div>
        <nav className="overflow-y-auto px-2 pb-3" aria-label="Channels">
          {loading ? (
            <p className="px-2 text-sm text-muted">Loading…</p>
          ) : (
            <ul className="space-y-0.5">
              {channels.map((channel) => {
                const selected = channel.id === activeId;
                return (
                  <li key={channel.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(channel.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "bg-mint/15 font-semibold text-navy"
                          : "text-ink/80 hover:bg-mist"
                      }`}
                    >
                      <span className="font-mono text-muted">#</span>
                      <span className="truncate">{channel.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <form onSubmit={createChannel} className="border-t border-navy/8 p-3">
          <label className="block">
            <span className="label-mono">New channel</span>
            <div className="mt-1.5 flex gap-1.5">
              <input
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="name"
                className="min-w-0 flex-1 rounded-lg border border-navy/10 bg-mist/40 px-2.5 py-2 text-sm outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
              <button
                type="submit"
                disabled={pending || !newChannel.trim()}
                className="rounded-lg bg-mint px-2.5 py-2 text-xs font-semibold text-navy disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </label>
        </form>
      </aside>

      <section className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-mist/40">
        {active ? (
          <>
            <header className="border-b border-navy/8 bg-white px-5 py-3">
              <h2 className="text-base font-semibold text-ink">
                <span className="font-mono text-muted">#</span>
                {active.name}
              </h2>
              {active.description ? (
                <p className="mt-0.5 text-xs text-muted">{active.description}</p>
              ) : null}
            </header>

            <div className="space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-ink">No messages yet</p>
                  <p className="mt-1 text-sm text-muted">
                    Say hello in #{active.name}.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className="flex gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-navy/5"
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy font-mono text-xs font-semibold text-mint"
                      aria-hidden
                    >
                      {initials(message.authorName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm font-semibold text-ink">
                          {message.authorName}
                        </span>
                        <time className="font-mono text-[0.7rem] text-muted">
                          {formatTime(message.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
                        {message.body}
                      </p>
                    </div>
                  </article>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={sendMessage}
              className="border-t border-navy/8 bg-white px-4 py-3"
            >
              {error ? (
                <p className="mb-2 text-xs font-semibold text-coral" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex gap-2">
                <label className="sr-only" htmlFor="chat-draft">
                  Message
                </label>
                <input
                  id="chat-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message #${active.name}`}
                  className="min-w-0 flex-1 rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={pending || !draft.trim()}
                  className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="col-span-full flex items-center justify-center text-sm text-muted">
            {loading ? "Loading chat…" : "Select a channel to start."}
          </div>
        )}
      </section>
    </div>
  );
}
