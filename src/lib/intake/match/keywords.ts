import type { OppLane } from "@/lib/opportunities/types";

/** Default lane keyword lists — Settings can override / extend. */
export const DEFAULT_LANE_KEYWORDS: Record<
  Exclude<OppLane, "Other">,
  string[]
> = {
  "ICT / IS": [
    "software",
    "software development",
    "systems development",
    "application development",
    "custom software",
    "system integration",
    "software solution",
    "web application",
    "mobile application",
    "ICT",
    "IT",
    "information system",
    "database",
    "cloud",
    "SaaS",
    "API",
    "digitisation",
    "digital transformation",
    "ERP",
    "management information system",
    "MIS",
    "IT infrastructure",
    "network",
    "cybersecurity",
    "information security",
    "IT support",
    "managed services",
    "help desk",
    "service desk",
    "hosting",
    "SSL",
    "data centre",
    "software licences",
    "software maintenance",
    "ICT equipment",
    "hardware supply",
    "end-user computing",
  ],
  Website: [
    "website",
    "web development",
    "website migration",
    "web maintenance",
    "web hosting",
  ],
  "Asset management": [
    "asset verification",
    "asset management",
    "asset register",
    "asset count",
    "barcoding",
  ],
  "Solar / electrical": [
    "solar",
    "PV",
    "photovoltaic",
    "electrical",
    "reticulation",
    "generator",
    "energy",
  ],
};

export const PANEL_KEYWORDS = [
  "panel",
  "framework agreement",
  "framework contract",
  "roster",
  "prequalification",
  "pre-qualification",
  "prequalified",
  "panel of service providers",
  "panel of software developers",
  "panel of ICT",
  "panel of consultants",
  "standing offer",
  "term contract",
  "period contract",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word/phrase match; short tokens like IT/PV require word boundaries. */
export function textMatchesTerm(haystack: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return false;
  const text = haystack.toLowerCase();
  if (t.length <= 3) {
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, "i");
    return re.test(text);
  }
  return text.includes(t);
}

export function countTermHits(haystack: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (textMatchesTerm(haystack, term)) score += 1;
  }
  return score;
}
