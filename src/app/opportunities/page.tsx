import { AppShell } from "@/components/app-shell";

export default function OpportunitiesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <p className="label-mono mb-2">Board</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
          Opportunities
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Kanban + table views ship in M2. This route is wired so the sidebar
          already feels like the finished app.
        </p>
        <div className="mt-8 rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">Board coming in M2</p>
          <p className="mt-2 text-sm text-muted">
            Manual post, email-in, drag-and-drop stages.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
