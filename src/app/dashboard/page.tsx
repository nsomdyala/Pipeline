import { AppShell } from "@/components/app-shell";
import { TeamHub } from "@/components/dashboard/team-hub";
import { getSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await getSession();
  return (
    <AppShell>
      <TeamHub userName={session?.name ?? "Team"} />
    </AppShell>
  );
}
