import { AppShell } from "@/components/app-shell";
import { IdeasRegisterBoard } from "@/components/ideas/ideas-register-board";
import { getSession } from "@/lib/auth/session";
import { canAccessIdeas } from "@/lib/ideas/access";
import { redirect } from "next/navigation";

export default async function IdeasPage() {
  const session = await getSession();
  if (!canAccessIdeas(session?.role)) {
    redirect("/my-work");
  }

  return (
    <AppShell>
      <IdeasRegisterBoard role={session!.role} />
    </AppShell>
  );
}
