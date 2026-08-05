import { AppShell } from "@/components/app-shell";
import { PmoPortfolioBoard } from "@/components/pmo/pmo-portfolio-board";
import { getSession } from "@/lib/auth/session";
import { canAccessPmo } from "@/lib/pmo/access";
import { redirect } from "next/navigation";

export default async function PmoPage() {
  const session = await getSession();
  if (!canAccessPmo(session?.role)) {
    redirect("/");
  }

  return (
    <AppShell>
      <PmoPortfolioBoard />
    </AppShell>
  );
}
