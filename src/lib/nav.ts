export type NavSection = "work" | "collaborate" | "company";

export type NavItem = {
  href: string;
  label: string;
  section: NavSection;
  /** Shown as a primary icon on the workspace rail */
  rail?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/", label: "My work", section: "work" },
  { href: "/dashboard", label: "Team hub", section: "work", rail: true },
  { href: "/tenders", label: "All Tenders", section: "work", rail: true },
  { href: "/opportunities", label: "Opportunities", section: "work", rail: true },
  { href: "/leads", label: "Leads", section: "work" },
  { href: "/accounts", label: "Accounts", section: "work" },
  { href: "/partners", label: "Partners", section: "company" },
  { href: "/compliance", label: "Compliance", section: "company", rail: true },
  { href: "/proposals", label: "Proposals", section: "company", rail: true },
  { href: "/chat", label: "Chat", section: "collaborate", rail: true },
  { href: "/discussions", label: "Discussions", section: "collaborate", rail: true },
  { href: "/calendar", label: "Calendar", section: "collaborate", rail: true },
  { href: "/settings", label: "Settings", section: "company" },
];

export const navSections: Array<{ key: NavSection; title: string }> = [
  { key: "work", title: "Work" },
  { key: "collaborate", title: "Collaborate" },
  { key: "company", title: "Company" },
];

export function navItemForPath(pathname: string): NavItem | undefined {
  const exact = navItems.find((item) => item.href === pathname);
  if (exact) return exact;
  return navItems
    .filter((item) => item.href !== "/")
    .find((item) => pathname.startsWith(item.href));
}

export function sectionForPath(pathname: string): NavSection {
  return navItemForPath(pathname)?.section ?? "work";
}
