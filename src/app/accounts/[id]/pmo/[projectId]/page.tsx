import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PmoProjectWorkspace } from "@/components/pmo/pmo-project-workspace";
import { getSession } from "@/lib/auth/session";
import { canAccessPmo } from "@/lib/pmo/access";

type Props = {
  params: Promise<{ id: string; projectId: string }>;
};

export default async function AccountPmoProjectPage({ params }: Props) {
  const session = await getSession();
  if (!canAccessPmo(session?.role)) {
    redirect("/");
  }

  const { id, projectId } = await params;
  return (
    <AppShell>
      <PmoProjectWorkspace accountId={id} projectId={projectId} />
    </AppShell>
  );
}
