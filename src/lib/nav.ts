export type NavItem = {
  href: string;
  label: string;
  section?: "work" | "collaborate" | "company";
};

export const navItems: NavItem[] = [
  { href: "/", label: "My work", section: "work" },
  { href: "/opportunities", label: "Opportunities", section: "work" },
  { href: "/leads", label: "Leads", section: "work" },
  { href: "/accounts", label: "Accounts", section: "work" },
  { href: "/invoices", label: "Invoices", section: "work" },
  { href: "/compliance", label: "Compliance", section: "company" },
  { href: "/proposals", label: "Proposals", section: "company" },
  { href: "/chat", label: "Chat", section: "collaborate" },
  { href: "/discussions", label: "Discussions", section: "collaborate" },
  { href: "/calendar", label: "Calendar", section: "collaborate" },
  { href: "/settings", label: "Settings", section: "company" },
];
