/** Canonical Max Attention company narrative from website + company profile decks. */

export const COMPANY_PILLARS = [
  {
    title: "Electrical & Solar Energy",
    summary: "Industrial power solutions & off-grid systems.",
    detail:
      "Design, supply, install and support industrial solar, general electrical works, and Smart Pole off-grid systems for remote network and PoE camera sites.",
  },
  {
    title: "Chain 360 Asset Management",
    summary: "AI-powered lifecycle management platform.",
    detail:
      "In-house flagship platform for real-time tracking, predictive maintenance, compliance reporting, and ERP/IoT integration.",
  },
  {
    title: "Custom Software",
    summary: "Tailored ERP, AI & automation tools.",
    detail:
      "ERP systems, asset software, AI contract management, and workflow automation built around operational needs.",
  },
  {
    title: "ICT Equipment Supply",
    summary: "Computers, networking & server infrastructure.",
    detail:
      "End-to-end procurement of desktops, servers, storage, networking and peripherals — with delivery and asset tagging.",
  },
  {
    title: "Support & Maintenance",
    summary: "24/7 proactive monitoring & helpdesk.",
    detail:
      "Local South African team providing continuous monitoring, updates, and rapid-response support by phone, email and remote assist.",
  },
] as const;

export const COMPANY_PRODUCTS = [
  {
    group: "Property & Assets",
    items: [
      { name: "Chain360", blurb: "Asset management & verification" },
      { name: "Smart360", blurb: "Property & facility management" },
      { name: "Digitise It", blurb: "Document management (EDMS)" },
    ],
  },
  {
    group: "Infrastructure",
    items: [
      { name: "SolarWatch", blurb: "Solar & asset monitoring" },
      { name: "Smart Poles", blurb: "Solar smart-pole solution" },
    ],
  },
  {
    group: "Governance & Legal",
    items: [
      { name: "Pulse", blurb: "Governance, risk & compliance" },
      { name: "Lawgic", blurb: "Legal & compliance" },
    ],
  },
  {
    group: "Health",
    items: [
      { name: "LittleShield", blurb: "Maternal & child health" },
      { name: "LulamaEkhaya Health", blurb: "Community health" },
      { name: "NEXGEN", blurb: "Occupational health" },
    ],
  },
] as const;

export const COMPANY_INDUSTRIES = [
  "Mining",
  "Manufacturing",
  "Logistics",
  "Security",
  "Enterprise",
  "Government",
  "Energy",
  "Telecoms",
] as const;

export const COMPANY_DEFAULTS = {
  name: "Max Attention Technologies (Pty) Ltd",
  tradingAs: "Max Attention Technologies",
  regNo: "2022/775648/07",
  csdNo: "",
  vatNo: "",
  taxPin: "",
  bbbeeLevel: "",
  address: "Unit 16, Micro Park, 6 Houer Rd, City Deep, Johannesburg, 2049",
  email: "bid@maxattention.co.za",
  phone: "+27 61 199 1138",
  tagline: "Transforming businesses through integrated innovation.",
  website: "https://www.maxattention.tech",
  foundedYear: "2022",
  directors: "Ms. Akhona Letseka",
  provinces: "City Deep, Johannesburg · National readiness",
  about:
    "A Johannesburg-based technology & energy solutions partner established in 2022, delivering integrated solutions across enterprise software, electrical & solar energy, ICT hardware supply, and asset management — from off-grid power to predictive maintenance.",
  vision:
    "To be the leading integrated solutions provider, redefining operational efficiency and sustainability by unifying advanced enterprise technology, cutting-edge asset management, and robust power infrastructure.",
  mission:
    "To empower businesses with a seamlessly integrated portfolio of innovative software, specialised electrical and solar solutions, and expert support — delivering comprehensive services from off-grid power to predictive maintenance that drive operational excellence, competitive advantage, and resilient infrastructure.",
  bankDetails: {
    bankName: "",
    accountName: "Max Attention Technologies (Pty) Ltd",
    accountNumber: "",
    branchCode: "",
  },
} as const;
