import type { Metadata } from "next";
import { PipelineMark } from "@/components/brand/pipeline-mark";

export const metadata: Metadata = {
  title: "Clay Bureau — Style guide",
  description: "Pipeline visual identity — Clay Bureau component showcase.",
};

const PRIMARY = [
  { name: "Bone", token: "--bone", hex: "#F3F1EA", swatch: "bg-bone" },
  { name: "Surface", token: "--surface", hex: "#FFFFFF", swatch: "bg-surface ring-1 ring-border" },
  { name: "Taupe", token: "--taupe", hex: "#787465", swatch: "bg-taupe" },
  { name: "Ink", token: "--ink", hex: "#2A2E22", swatch: "bg-ink" },
  { name: "Clay", token: "--clay", hex: "#A8652C", swatch: "bg-clay" },
] as const;

const SEMANTIC = [
  { name: "Sage", token: "--sage", hex: "#3D6B52", swatch: "bg-sage", tint: "bg-sage-tint" },
  { name: "Mustard", token: "--mustard", hex: "#B0892E", swatch: "bg-mustard", tint: "bg-mustard-tint" },
  { name: "Brick", token: "--brick", hex: "#B04A3A", swatch: "bg-brick", tint: "bg-brick-tint" },
  { name: "Steel", token: "--steel", hex: "#3F6588", swatch: "bg-steel", tint: "bg-steel-tint" },
] as const;

export default function StyleGuidePage() {
  return (
    <div className="min-h-dvh bg-bone text-ink">
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        {/* Header — mirrors CI lockup */}
        <header className="mb-14 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-10">
          <div className="flex items-center gap-3.5">
            <PipelineMark size={48} />
            <div>
              <div className="wordmark text-3xl leading-none tracking-[-0.03em]">
                Pipeline
              </div>
              <p className="mt-1.5 text-sm text-muted">
                Clay Bureau · warm bone · Instrument Sans + JetBrains Mono
              </p>
            </div>
          </div>
          <p className="label-mono">Style guide · 1c</p>
        </header>

        {/* Palette */}
        <section className="mb-16">
          <p className="label-mono mb-4">Palette</p>
          <div className="grid gap-3 sm:grid-cols-5">
            {PRIMARY.map((c) => (
              <div key={c.token} className="min-w-0">
                <div
                  className={`h-24 rounded-2xl ${c.swatch}`}
                  aria-hidden
                />
                <div className="mt-2.5">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="data-mono mt-0.5 text-xs text-muted">{c.hex}</div>
                  <div className="data-mono text-[0.65rem] text-muted/80">
                    {c.token}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {SEMANTIC.map((c) => (
              <div key={c.token} className="min-w-0">
                <div className="flex h-14 overflow-hidden rounded-2xl ring-1 ring-border">
                  <div className={`w-1/2 ${c.swatch}`} />
                  <div className={`w-1/2 ${c.tint}`} />
                </div>
                <div className="mt-2.5">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="data-mono mt-0.5 text-xs text-muted">{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <p className="label-mono mb-4">Typography</p>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="surface p-6">
              <p className="label-mono mb-3">Instrument Sans</p>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                Northwind retrofit
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Headings, labels, buttons, and body — regular, medium, and
                semibold only. Sentence case throughout.
              </p>
              <div className="mt-5 space-y-1 text-sm">
                <p className="font-normal">Regular — body copy</p>
                <p className="font-medium">Medium — emphasis</p>
                <p className="font-semibold">Semibold — headings & actions</p>
              </div>
            </div>
            <div className="surface p-6">
              <p className="label-mono mb-3">JetBrains Mono</p>
              <p className="data-mono text-sm text-muted">
                PL-2081 · 12 Aug
              </p>
              <p className="data-mono mt-2 text-2xl font-semibold tracking-tight">
                R48,200
              </p>
              <p className="mt-4 text-sm text-muted">
                Refs, IDs, amounts, dates, and uppercase section labels.
              </p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-16">
          <p className="label-mono mb-4">Buttons</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary">
              New deal
            </button>
            <button type="button" className="btn btn-secondary">
              Export
            </button>
            <button type="button" className="btn btn-ghost">
              Cancel
            </button>
            <button type="button" className="btn btn-danger">
              Delete
            </button>
            <button type="button" className="btn btn-primary" disabled>
              Disabled
            </button>
          </div>
        </section>

        {/* Status pills */}
        <section className="mb-16">
          <p className="label-mono mb-4">Status pills</p>
          <div className="flex flex-wrap gap-2">
            <span className="pill pill-live">Live</span>
            <span className="pill pill-overdue">Overdue</span>
            <span className="pill pill-warning">Warning</span>
            <span className="pill pill-info">Info</span>
            <span className="pill">Neutral</span>
            <span className="pill pill-accent">Active</span>
          </div>
        </section>

        {/* Cards + table */}
        <section className="mb-16">
          <p className="label-mono mb-4">Cards</p>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="surface flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <h3 className="text-base font-semibold">Northwind retrofit</h3>
                <p className="data-mono mt-1 text-xs text-muted">
                  PL-2081 · 12 Aug
                </p>
              </div>
              <p className="data-mono shrink-0 text-lg font-semibold">
                R48,200
              </p>
            </article>
            <article className="surface flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">Harbour tender</h3>
                  <span className="pill pill-overdue">Overdue</span>
                </div>
                <p className="data-mono mt-1 text-xs text-muted">
                  PL-2044 · 28 Jul
                </p>
              </div>
              <p className="data-mono shrink-0 text-lg font-semibold">
                R126,000
              </p>
            </article>
          </div>
        </section>

        <section className="mb-16">
          <p className="label-mono mb-4">Form + table</p>
          <div className="surface overflow-hidden">
            <div className="grid gap-4 border-b border-border p-5 md:grid-cols-2">
              <label className="block text-sm font-medium">
                Deal name
                <input
                  className="field mt-1.5"
                  defaultValue="Northwind retrofit"
                />
              </label>
              <label className="block text-sm font-medium">
                Reference
                <input
                  className="field data-mono mt-1.5"
                  defaultValue="PL-2081"
                />
              </label>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="label-mono px-5 py-3 font-medium">Ref</th>
                  <th className="label-mono px-5 py-3 font-medium">Account</th>
                  <th className="label-mono px-5 py-3 font-medium">Status</th>
                  <th className="label-mono px-5 py-3 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="row-hover border-b border-border/70">
                  <td className="data-mono px-5 py-3.5 text-muted">PL-2081</td>
                  <td className="px-5 py-3.5 font-medium">Northwind</td>
                  <td className="px-5 py-3.5">
                    <span className="pill pill-live">Live</span>
                  </td>
                  <td className="data-mono px-5 py-3.5 text-right font-semibold">
                    R48,200
                  </td>
                </tr>
                <tr className="row-hover">
                  <td className="data-mono px-5 py-3.5 text-muted">PL-2044</td>
                  <td className="px-5 py-3.5 font-medium">Harbour Co</td>
                  <td className="px-5 py-3.5">
                    <span className="pill pill-overdue">Overdue</span>
                  </td>
                  <td className="data-mono px-5 py-3.5 text-right font-semibold">
                    R126,000
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Empty / loading */}
        <section className="mb-8">
          <p className="label-mono mb-4">Empty + loading</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-surface-warm px-6 py-12 text-center text-sm text-muted">
              No deals in this stage yet.
            </div>
            <div className="surface space-y-3 p-5" aria-hidden>
              <div className="h-3 w-2/5 animate-pulse rounded-full bg-[var(--row-hover)]" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-[var(--row-hover)]" />
              <div className="h-3 w-3/5 animate-pulse rounded-full bg-[var(--row-hover)]" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
