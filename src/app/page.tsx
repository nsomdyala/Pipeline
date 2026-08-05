import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { getSession } from "@/lib/auth/session";
import { canSeeDashboard } from "@/lib/dashboard/access";

export default async function HomePage() {
  const session = await getSession();
  if (!canSeeDashboard(session?.role)) {
    redirect("/my-work");
  }

  return (
    <AppShell>
      <ExecutiveDashboard
        userName={session?.name ?? "Guest"}
        role={session?.role ?? "viewer"}
      />
    </AppShell>
  );
}
