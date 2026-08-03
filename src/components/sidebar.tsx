"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderKanban,
  Gavel,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Settings,
  Users,
} from "lucide-react";
import { openLiveChat } from "@/components/chat/live-chat-rail";
import { Avatar } from "@/components/ui/avatar";
import {
  navItems,
  navSections,
  sectionForPath,
  type NavItem,
  type NavSection,
} from "@/lib/nav";

const ICONS: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  "/": BriefcaseBusiness,
  "/dashboard": LayoutDashboard,
  "/tenders": ClipboardList,
  "/opportunities": FolderKanban,
  "/leads": Users,
  "/accounts": Building2,
  "/partners": Handshake,
  "/compliance": Gavel,
  "/proposals": FileText,
  "/chat": MessageSquare,
  "/discussions": MessagesSquare,
  "/calendar": CalendarDays,
  "/settings": Settings,
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  userName = "Guest",
  role = "Viewer",
  avatarUrl = null,
}: {
  userName?: string;
  role?: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeSection = sectionForPath(pathname);
  const [openSections, setOpenSections] = useState<Record<NavSection, boolean>>({
    work: true,
    collaborate: true,
    company: true,
  });

  function signOut() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  function toggleSection(key: NavSection) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onNavClick(item: NavItem) {
    if (item.href === "/chat") openLiveChat();
  }

  return (
    <aside
      className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col bg-navy text-[var(--slack-sidebar-text)]"
      aria-label="Main"
    >
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-3">
        <Link
          href="/"
          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-avatar)] bg-white/10 ring-1 ring-white/15"
          aria-label="Pipeline home"
        >
          <Image
            src="/brand/pipeline-mark-primary.svg"
            alt="Pipeline"
            width={22}
            height={22}
            priority
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="wordmark truncate text-[0.95rem]">Pipeline</div>
          <div className="mt-0.5 text-[0.65rem] text-white/45">
            Aura Workstream
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navigation">
        {navSections.map((section) => {
          const items = navItems.filter((item) => item.section === section.key);
          const open = openSections[section.key];
          const sectionActive = activeSection === section.key;
          return (
            <div key={section.key} className="mb-3">
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={`flex w-full items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-left text-[0.7rem] font-semibold uppercase tracking-[0.06em] transition hover:bg-white/5 ${
                  sectionActive
                    ? "text-[var(--slack-sidebar-text-active)]"
                    : "text-[var(--slack-sidebar-section)]"
                }`}
                aria-expanded={open}
              >
                <ChevronDown
                  size={14}
                  className={`transition ${open ? "" : "-rotate-90"}`}
                />
                {section.title}
              </button>
              {open ? (
                <ul className="mt-0.5 space-y-px">
                  {items.map((item) => {
                    const Icon = ICONS[item.href] ?? FolderKanban;
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => onNavClick(item)}
                          className={`flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-[0.35rem] text-[0.875rem] transition ${
                            active
                              ? "bg-[var(--slack-aubergine-hover)] font-semibold text-white"
                              : "text-[var(--slack-sidebar-text)] hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <Icon size={15} className="opacity-80" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={userName} src={avatarUrl} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">
              {userName}
            </div>
            <div className="truncate text-[0.65rem] text-mint">{role}</div>
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          <Link
            href="/settings"
            className="btn btn-ghost flex-1 justify-start px-2 py-1.5 text-xs text-white/55 hover:text-white"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="btn btn-ghost flex-1 justify-start px-2 py-1.5 text-xs text-white/55 hover:text-white disabled:opacity-50"
          >
            {pending ? "…" : "Sign out"}
          </button>
        </div>
      </div>
    </aside>
  );
}
