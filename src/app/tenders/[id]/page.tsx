import { AppShell } from "@/components/app-shell";
import { TenderDetail } from "@/components/tenders/tender-detail";

type Props = { params: Promise<{ id: string }> };

export default async function TenderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AppShell>
      <TenderDetail id={id} />
    </AppShell>
  );
}
