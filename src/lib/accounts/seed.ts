import type { Account } from "@/lib/accounts/types";

/** Converted / won work in delivery — includes The Innovation Hub. */
export function seedAccounts(now = new Date()): Account[] {
  const iso = now.toISOString();
  const on = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };
  const until = (daysAhead: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  };

  return [
    {
      id: "acct-innovationhub",
      clientName: "The Innovation Hub",
      projectTitle: "Digital platforms support and website enhancements",
      refNo: "TIH-ICT-2025-014",
      lane: "Website",
      sector: "public",
      status: "active",
      progressPercent: 45,
      valueZar: 680000,
      startOn: on(90),
      endOn: until(120),
      notes:
        "Converted from awarded RFQ. Delivery in progress — keep signed contract, appointment letter, billing and status packs current.",
      ownerName: "Ndumiso Somdyala",
      convertedFromOpportunity: true,
      documents: [],
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: "acct-saqa-asset",
      clientName: "SAQA",
      projectTitle: "Asset verification system — implementation phase",
      refNo: "RFQ-SAQA-2025-088",
      lane: "Asset management",
      sector: "public",
      status: "active",
      progressPercent: 70,
      valueZar: 920000,
      startOn: on(150),
      endOn: until(60),
      notes: "Converted opportunity now in active delivery.",
      ownerName: "Ndumiso Somdyala",
      convertedFromOpportunity: true,
      documents: [],
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: "acct-gep-web",
      clientName: "GEP",
      projectTitle: "Website migration — warranty & support",
      refNo: "RFQ-GEP-2025-062",
      lane: "Website",
      sector: "public",
      status: "on_hold",
      progressPercent: 85,
      valueZar: 410000,
      startOn: on(200),
      endOn: until(30),
      notes: "Awaiting client content freeze before final handover.",
      ownerName: "Ndumiso Somdyala",
      convertedFromOpportunity: true,
      documents: [],
      createdAt: iso,
      updatedAt: iso,
    },
  ];
}
