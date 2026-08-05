import "server-only";

import { randomUUID } from "node:crypto";
import {
  DEFAULT_CATEGORY_LANE_MAP,
  defaultEtendersCategories,
} from "@/lib/intake/config/etenders-categories";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import { COMPANY_DEFAULTS } from "@/lib/company/content";
import {
  withCompanyDefaults,
  type AppUser,
  type CompanyProfile,
  type SettingsBundle,
  type UserRole,
} from "@/lib/settings/types";

export type {
  AppUser,
  CompanyProfile,
  PortalWatchItem,
  SettingsBundle,
  UserRole,
} from "@/lib/settings/types";
export { USER_ROLES, withCompanyDefaults } from "@/lib/settings/types";

const FILE = "settings.json";

function seed(): SettingsBundle {
  return {
    company: withCompanyDefaults({ ...COMPANY_DEFAULTS }),
    users: [
      {
        id: "user-admin",
        name: "Ndumiso Somdyala",
        email: "nsomdyala@maxattention.tech",
        role: "admin",
      },
      {
        id: "user-member-1",
        name: "Bid Team Member",
        email: "bids@maxattention.tech",
        role: "member",
      },
      {
        id: "user-viewer-1",
        name: "Finance Viewer",
        email: "finance@maxattention.tech",
        role: "viewer",
      },
    ],
    portals: [
      {
        id: "portal-tih",
        companyName: "The Innovation Hub",
        portalUrl: "https://www.theinnovationhub.com",
        industry: "Public entity / tech park",
        registrationStatus: "registered",
      },
      {
        id: "portal-sap",
        companyName: "SAP Business Network Discovery",
        portalUrl: "https://www.sap.com/products/business-network/discovery",
        industry: "Private marketplace",
        registrationStatus: "registered",
      },
    ],
    keywords: [
      {
        lane: "ICT / IS",
        terms: [
          "software",
          "systems development",
          "ICT",
          "information system",
          "digitisation",
          "software licences",
        ],
      },
      {
        lane: "Website",
        terms: [
          "website",
          "web development",
          "website migration",
          "web maintenance",
          "web hosting",
        ],
      },
      {
        lane: "Asset management",
        terms: [
          "asset verification",
          "asset management",
          "asset register",
          "barcoding",
        ],
      },
      {
        lane: "Solar / electrical",
        terms: ["solar", "PV", "photovoltaic", "electrical", "reticulation"],
      },
    ],
    categoryLaneMap: DEFAULT_CATEGORY_LANE_MAP,
    defaultEtendersCategories: defaultEtendersCategories(),
  };
}

function migrateCompanyProfile(company: CompanyProfile): CompanyProfile {
  const base = withCompanyDefaults(company);
  const looksPlaceholder =
    !base.regNo ||
    base.regNo === "2020/123456/07" ||
    base.address.includes("Innovation Hub") ||
    base.email === "nsomdyala@maxattention.tech";

  if (looksPlaceholder) {
    return withCompanyDefaults({
      ...COMPANY_DEFAULTS,
      // Keep only non-placeholder credential overrides
      csdNo:
        base.csdNo && !base.csdNo.startsWith("MAAA0")
          ? base.csdNo
          : COMPANY_DEFAULTS.csdNo,
      vatNo:
        base.vatNo && base.vatNo !== "4123456789"
          ? base.vatNo
          : COMPANY_DEFAULTS.vatNo,
      taxPin:
        base.taxPin && base.taxPin !== "••••••••"
          ? base.taxPin
          : COMPANY_DEFAULTS.taxPin,
      bbbeeLevel:
        base.bbbeeLevel && base.bbbeeLevel !== "Level 1 EME"
          ? base.bbbeeLevel
          : COMPANY_DEFAULTS.bbbeeLevel,
      bankDetails: {
        ...COMPANY_DEFAULTS.bankDetails,
        bankName: base.bankDetails.bankName || "",
        accountNumber: base.bankDetails.accountNumber || "",
        branchCode: base.bankDetails.branchCode || "",
      },
    });
  }

  return withCompanyDefaults({
    ...base,
    about: base.about || COMPANY_DEFAULTS.about,
    vision: base.vision || COMPANY_DEFAULTS.vision,
    mission: base.mission || COMPANY_DEFAULTS.mission,
    tagline: base.tagline || COMPANY_DEFAULTS.tagline,
    website: base.website || COMPANY_DEFAULTS.website,
    directors: base.directors || COMPANY_DEFAULTS.directors,
  });
}

function withSettingsDefaults(bundle: SettingsBundle): SettingsBundle {
  return {
    ...bundle,
    company: migrateCompanyProfile(bundle.company),
    categoryLaneMap:
      bundle.categoryLaneMap?.length > 0
        ? bundle.categoryLaneMap
        : DEFAULT_CATEGORY_LANE_MAP,
    defaultEtendersCategories:
      bundle.defaultEtendersCategories?.length > 0
        ? bundle.defaultEtendersCategories
        : defaultEtendersCategories(),
  };
}

export async function getSettings() {
  const existing = await readJsonFile<SettingsBundle | null>(FILE, null);
  if (existing) {
    const migrated = withSettingsDefaults(existing);
    const companyChanged =
      JSON.stringify(existing.company) !== JSON.stringify(migrated.company);
    if (
      companyChanged ||
      !existing.categoryLaneMap?.length ||
      !existing.defaultEtendersCategories?.length
    ) {
      await writeJsonFile(FILE, migrated);
    }
    return migrated;
  }
  const seeded = seed();
  await writeJsonFile(FILE, seeded);
  return seeded;
}

export async function saveCompany(company: CompanyProfile) {
  const settings = await getSettings();
  settings.company = withCompanyDefaults(company);
  await writeJsonFile(FILE, settings);
  return settings;
}

export async function saveCategoryConfig(input: {
  categoryLaneMap: SettingsBundle["categoryLaneMap"];
  defaultEtendersCategories: string[];
}) {
  const settings = await getSettings();
  settings.categoryLaneMap = input.categoryLaneMap;
  settings.defaultEtendersCategories = input.defaultEtendersCategories;
  await writeJsonFile(FILE, settings);
  return settings;
}

export async function addUser(input: {
  name: string;
  email: string;
  role: UserRole;
}) {
  const settings = await getSettings();
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim() || !email) {
    throw new Error("Name and email are required.");
  }
  if (settings.users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("A user with that email already exists.");
  }

  const user: AppUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    role: input.role,
  };
  settings.users.push(user);
  await writeJsonFile(FILE, settings);
  return { settings, user };
}

export async function updateUserRole(id: string, role: UserRole) {
  const settings = await getSettings();
  const index = settings.users.findIndex((u) => u.id === id);
  if (index < 0) throw new Error("User not found.");
  settings.users[index] = { ...settings.users[index], role };
  await writeJsonFile(FILE, settings);
  return settings;
}

export async function removeUser(id: string) {
  const settings = await getSettings();
  const user = settings.users.find((u) => u.id === id);
  if (!user) throw new Error("User not found.");
  if (user.email === "nsomdyala@maxattention.tech") {
    throw new Error("The primary admin cannot be removed.");
  }
  settings.users = settings.users.filter((u) => u.id !== id);
  await writeJsonFile(FILE, settings);
  return settings;
}
