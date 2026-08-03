"use client";

import { usePathname } from "next/navigation";
import { navItemForPath } from "@/lib/nav";

export function MainTopBar() {
  const pathname = usePathname();
  const item = navItemForPath(pathname);
  const title = item?.label ?? "Pipeline";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--slack-border)] bg-white px-4 md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-[0.95rem] font-bold tracking-[-0.01em] text-ink">
          {title}
        </h1>
      </div>
      <div className="text-[0.7rem] font-medium text-muted">Pipeline</div>
    </header>
  );
}
