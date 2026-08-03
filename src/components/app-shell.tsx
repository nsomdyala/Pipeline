import { LiveChatRail } from "@/components/chat/live-chat-rail";
import { Sidebar } from "@/components/sidebar";
import { getSession, roleLabel } from "@/lib/auth/session";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const userName = session?.name ?? "Guest";

  return (
    <div className="flex h-dvh overflow-hidden bg-mist">
      <Sidebar
        userName={userName}
        role={session ? roleLabel(session.role) : "Viewer"}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto">{children}</div>
        </main>
        <LiveChatRail authorName={userName} />
      </div>
    </div>
  );
}
