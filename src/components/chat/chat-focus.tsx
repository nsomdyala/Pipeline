"use client";

import { useEffect } from "react";
import { openLiveChat } from "@/components/chat/live-chat-rail";

export function ChatFocus() {
  useEffect(() => {
    openLiveChat();
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:px-10">
      <p className="label-mono mb-2">Collaborate</p>
      <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
        Team chat
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        Live chat stays open on the right across every page — switch channels,
        follow opportunity alerts, and keep the team in sync without leaving
        your board.
      </p>
      <button
        type="button"
        onClick={() => openLiveChat()}
        className="mt-6 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-white"
      >
        Open live chat
      </button>
    </div>
  );
}
