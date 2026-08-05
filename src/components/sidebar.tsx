"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderKanban,
  Gavel,
  Handshake,
  Kanban,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  MessagesSquare,
  Settings,
  Share2,
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
import { canSeeDashboard } from "@/lib/dashboard/access";
import { canSeeIdeasNav } from "@/lib/ideas/access";
import { canSeePmoNav } from "@/lib/pmo/access";

const ICONS: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  "/": LayoutDashboard,
  "/my-work": BriefcaseBusiness,
  "/dashboard": Share2,
  "/tenders": ClipboardList,
  "/opportunities": FolderKanban,
  "/leads": Users,
  "/accounts": Building2,
  "/pmo": Kanban,
  "/ideas": Lightbulb,
  "/rd": FlaskConical,
  "/company": BadgeCheck,
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

type NavPermissions = {
  dashboard?: boolean;
  pmo?: boolean;
  ideas?: boolean;
  opportunities?: boolean;
  leads?: boolean;
  accounts?: boolean;
  compliance?: boolean;
  proposals?: boolean;
  chat?: boolean;
  discussions?: boolean;
  calendar?: boolean;
};

export function Sidebar({
  userName = "Guest",
  role = "Viewer",
  userRole = "viewer",
  avatarUrl = null,
  navPermissions,
}: {
  userName?: string;
  role?: string;
  userRole?: string;
  avatarUrl?: string | null;
  navPermissions?: NavPermissions;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeSection = sectionForPath(pathname);
  const [openSections, setOpenSections] = useState<Record<NavSection, boolean>>({
    work: true,
    collaborate: true,
    ideas: true,
    company: true,
  });

  const visibleNavItems = navItems.filter((item) => {
    // Prefer permission matrix from server; fall back to legacy role helpers.
    if (item.href === "/") {
      return navPermissions?.dashboard ?? canSeeDashboard(userRole);
    }
    if (item.href === "/pmo") {
      return navPermissions?.pmo ?? canSeePmoNav(userRole);
    }
    if (item.href === "/ideas" || item.href === "/rd") {
      return navPermissions?.ideas ?? canSeeIdeasNav(userRole);
    }
    if (item.href === "/opportunities") {
      return navPermissions?.opportunities ?? true;
    }
    if (item.href === "/leads") {
      return navPermissions?.leads ?? true;
    }
    if (item.href === "/accounts") {
      return navPermissions?.accounts ?? true;
    }
    if (item.href === "/compliance") {
      return navPermissions?.compliance ?? true;
    }
    if (item.href === "/proposals") {
      return navPermissions?.proposals ?? true;
    }
    if (item.href === "/chat") {
      return navPermissions?.chat ?? true;
    }
    if (item.href === "/discussions") {
      return navPermissions?.discussions ?? true;
    }
    if (item.href === "/calendar") {
      return navPermissions?.calendar ?? true;
    }
    return true;
  });

  function signOut() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
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
      className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-[var(--border)] bg-bone text-[var(--slack-sidebar-text)]"
      aria-label="Main"
    >
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-3">
        <Link
          href="/"
          className="flex size-9 shrink-0 items-center justify-center"
          aria-label="Pipeline home"
        >
          <Image
            src="/brand/pipeline-mark-primary.svg"
            alt="Pipeline"
            width={32}
            height={32}
            priority
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="wordmark truncate text-[0.95rem]">Pipeline</div>
          <div className="mt-0.5 text-[0.65rem] text-muted">
            Aura Workstream
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navigation">
        {navSections.map((section) => {
          const items = visibleNavItems.filter(
            (item) => item.section === section.key,
          );
          if (items.length === 0) return null;
          const open = openSections[section.key];
          const sectionActive = activeSection === section.key;
          return (
            <div key={section.key} className="mb-3">
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={`flex w-full items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-left text-[0.7rem] font-semibold uppercase tracking-[0.06em] transition hover:bg-[var(--row-hover)] ${sectionActive ? "text-[var(--slack-sidebar-text-active)]" : "text-[var(--slack-sidebar-section)]"}`}
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
                          className={`flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-[0.4rem] text-[0.875rem] transition ${active ? "bg-[var(--slack-aubergine-hover)] font-semibold text-ink shadow-[inset_3px_0_0_0_var(--clay)]" : "text-[var(--slack-sidebar-text)] hover:bg-[var(--row-hover)] hover:text-ink"}`}
                        >
                          <Icon
                            size={15}
                            className={active ? "text-clay" : "opacity-80"}
                          />
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

      <div className="border-t border-[var(--border)] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={userName} src={avatarUrl} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">
              {userName}
            </div>
            <div className="truncate font-mono text-[0.65rem] uppercase tracking-[0.06em] text-clay">
              {role}
            </div>
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          <Link
            href="/settings"
            className="btn btn-ghost flex-1 justify-start px-2 py-1.5 text-xs"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="btn btn-ghost flex-1 justify-start px-2 py-1.5 text-xs disabled:opacity-50"
          >
            {pending ? "…" : "Sign out"}
          </button>
        </div>
      </div>
    </aside>
  );
}
