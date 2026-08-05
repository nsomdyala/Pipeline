import { AppShell } from "@/components/app-shell";
import { WorkspaceDashboard } from "@/components/dashboard/workspace-dashboard";
import { getSession } from "@/lib/auth/session";

export default async function MyWorkPage() {
  const session = await getSession();

  return (
    <AppShell>
      <WorkspaceDashboard
        userName={session?.name ?? "Guest"}
        role={session?.role ?? "viewer"}
      />
    </AppShell>
  );
}
