import { AppShell } from "@/components/app-shell";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  milestone,
  nextStep,
}: {
  eyebrow: string;
  title: string;
  description: string;
  milestone: string;
  nextStep: string;
}) {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <p className="label-mono mb-2">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>
        <div className="mt-8 rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-16 text-center">
          <p className="label-mono mb-2">{milestone}</p>
          <p className="text-sm font-semibold text-ink">Coming soon</p>
          <p className="mt-2 text-sm text-muted">{nextStep}</p>
        </div>
      </div>
    </AppShell>
  );
}
