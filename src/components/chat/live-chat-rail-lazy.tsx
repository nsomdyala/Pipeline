"use client";

import dynamic from "next/dynamic";

const LiveChatRail = dynamic(
  () =>
    import("@/components/chat/live-chat-rail").then((m) => m.LiveChatRail),
  {
    ssr: false,
    loading: () => (
      <div
        className="hidden w-10 shrink-0 border-l border-[var(--slack-border)] bg-white lg:block"
        aria-hidden
      />
    ),
  },
);

export function LiveChatRailLazy(props: {
  authorName: string;
  authorAvatarUrl?: string | null;
}) {
  return <LiveChatRail {...props} />;
}
