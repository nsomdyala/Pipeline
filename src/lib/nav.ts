export type NavSection = "work" | "collaborate" | "company";

export type NavItem = {
  href: string;
  label: string;
  section: NavSection;
};

export const navItems: NavItem[] = [
  { href: "/", label: "My work", section: "work" },
  { href: "/dashboard", label: "Team hub", section: "work" },
  { href: "/tenders", label: "All Tenders", section: "work" },
  { href: "/opportunities", label: "Opportunities", section: "work" },
  { href: "/leads", label: "Leads", section: "work" },
  { href: "/accounts", label: "Accounts", section: "work" },
  { href: "/partners", label: "Partners", section: "company" },
  { href: "/compliance", label: "Compliance", section: "company" },
  { href: "/proposals", label: "Proposals", section: "company" },
  { href: "/chat", label: "Chat", section: "collaborate" },
  { href: "/discussions", label: "Discussions", section: "collaborate" },
  { href: "/calendar", label: "Calendar", section: "collaborate" },
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
