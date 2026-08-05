import { AppShell } from "@/components/app-shell";
import { RdBoard } from "@/components/rd/rd-board";
import { getSession } from "@/lib/auth/session";
import { canAccessIdeas } from "@/lib/ideas/access";
import { redirect } from "next/navigation";

export default async function RdPage() {
  const session = await getSession();
  if (!canAccessIdeas(session?.role)) {
    redirect("/my-work");
  }

  return (
    <AppShell>
      <RdBoard />
    </AppShell>
  );
}
