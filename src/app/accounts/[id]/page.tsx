import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AccountDetailBoard } from "@/components/accounts/account-detail-board";

type Props = { params: Promise<{ id: string }> };

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-muted md:px-10">
            Loading account…
          </div>
        }
      >
        <AccountDetailBoard accountId={id} />
      </Suspense>
    </AppShell>
  );
}
