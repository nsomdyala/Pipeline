export type NavItem = {
  href: string;
  label: string;
  section?: "work" | "collaborate" | "company";
};

export const navItems: NavItem[] = [
  { href: "/", label: "My work", section: "work" },
  { href: "/dashboard", label: "Team hub", section: "work" },
  { href: "/opportunities", label: "Opportunities", section: "work" },
  { href: "/tenders", label: "All Tenders", section: "work" },
  { href: "/leads", label: "Leads", section: "work" },
  { href: "/accounts", label: "Accounts", section: "work" },
  { href: "/partners", label: "Partners", section: "company" },
  { href: "/compliance", label: "Compliance", section: "company" },
  { href: "/proposals", label: "Proposals", section: "company" },
  { href: "/chat", label: "Chat", section: "collaborate" },
  { href: "/calendar", label: "Calendar", section: "collaborate" },
  { href: "/settings", label: "Settings", section: "company" },
];
