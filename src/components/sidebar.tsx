"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { openLiveChat } from "@/components/chat/live-chat-rail";
import { navItems } from "@/lib/nav";

const sections = [
  { key: "work", title: "Work" },
  { key: "collaborate", title: "Collaborate" },
  { key: "company", title: "Company" },
] as const;

export function Sidebar({
  userName = "Ndumiso Somdyala",
  role = "Admin",
}: {
  userName?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col bg-navy text-white">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <Image
          src="/brand/pipeline-mark-primary.svg"
          alt="Pipeline"
          width={36}
          height={36}
          priority
        />
        <div className="min-w-0">
          <div className="wordmark text-[1.05rem] leading-none">Pipeline</div>
          <div className="label-mono mt-1.5 text-[0.625rem] text-white/45">
            Aura Workstream
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {sections.map((section) => {
          const items = navItems.filter((item) => item.section === section.key);
          return (
            <div key={section.key} className="mb-5">
              <div className="label-mono px-2 mb-2 text-white/35">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (item.href === "/chat") openLiveChat();
                        }}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-mint/15 text-mint"
                            : "text-white/75 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/pipeline-mark-avatar.svg"
            alt=""
            width={32}
            height={32}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-[-0.02em]">
              {userName}
            </div>
            <div className="label-mono mt-0.5 text-[0.625rem] text-mint">
              {role}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className="mt-3 w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
