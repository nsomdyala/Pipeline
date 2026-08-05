import { LiveChatRailLazy } from "@/components/chat/live-chat-rail-lazy";
import { Sidebar } from "@/components/sidebar";
import { MainTopBar } from "@/components/main-top-bar";
import { getSession, roleLabel } from "@/lib/auth/session";
import { defaultAllows } from "@/lib/permissions/defaults";
import { permissionKeysForRole } from "@/lib/permissions/store";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const userName = session?.name ?? "Guest";
  // Prefer session cookie — avoid an extra DB round-trip on every page.
  const avatarUrl = session?.avatarUrl ?? null;
  const role = session?.role ?? "viewer";

  let permissionKeys: string[] = [];
  if (session) {
    try {
      permissionKeys = await permissionKeysForRole(role);
    } catch {
      permissionKeys = [];
    }
  }

  const canView = (module: Parameters<typeof defaultAllows>[1]) =>
    permissionKeys.includes(`${module}:view`) ||
    defaultAllows(role, module, "view");

  return (
    <div className="flex h-dvh overflow-hidden bg-bone">
      <Sidebar
        userName={userName}
        role={session ? roleLabel(role) : "Viewer"}
        userRole={role}
        avatarUrl={avatarUrl}
        navPermissions={{
          dashboard: canView("dashboard"),
          pmo: canView("pmo"),
          ideas: canView("ideas"),
          opportunities: canView("opportunities"),
          leads: canView("leads"),
          accounts: canView("accounts"),
          compliance: canView("compliance"),
          proposals: canView("proposals"),
          chat: canView("chat"),
          discussions: canView("discussions"),
          calendar: canView("calendar"),
        }}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface">
          <MainTopBar />
          <div className="min-h-0 flex-1 overflow-y-auto bg-bone">
            {children}
          </div>
        </main>
        <LiveChatRailLazy
          authorName={userName}
          authorAvatarUrl={avatarUrl}
        />
      </div>
    </div>
  );
}
