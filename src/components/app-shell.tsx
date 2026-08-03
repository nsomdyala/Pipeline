import { LiveChatRail } from "@/components/chat/live-chat-rail";
import { Sidebar } from "@/components/sidebar";
import { MainTopBar } from "@/components/main-top-bar";
import { getSession, roleLabel } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const userName = session?.name ?? "Guest";
  let avatarUrl = session?.avatarUrl ?? null;
  if (session?.id && !avatarUrl) {
    const fresh = await findUserById(session.id).catch(() => null);
    avatarUrl = fresh?.avatarUrl ?? null;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-mist">
      <Sidebar
        userName={userName}
        role={session ? roleLabel(session.role) : "Viewer"}
        avatarUrl={avatarUrl}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <MainTopBar />
          <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--slack-main-subtle)]">
            {children}
          </div>
        </main>
        <LiveChatRail
          authorName={userName}
          authorAvatarUrl={avatarUrl}
        />
      </div>
    </div>
  );
}
