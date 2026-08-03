import { randomUUID } from "node:crypto";
import {
  DEFAULT_CATEGORY_LANE_MAP,
  defaultEtendersCategories,
} from "@/lib/intake/config/etenders-categories";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import type {
  AppUser,
  CompanyProfile,
  SettingsBundle,
  UserRole,
} from "@/lib/settings/types";

export type {
  AppUser,
  CompanyProfile,
  PortalWatchItem,
  SettingsBundle,
  UserRole,
} from "@/lib/settings/types";
export { USER_ROLES } from "@/lib/settings/types";

const FILE = "settings.json";

function seed(): SettingsBundle {
  return {
    company: {
      name: "Max Attention Technologies",
      tradingAs: "Pipeline / Aura Workstream",
      regNo: "2020/123456/07",
      csdNo: "MAAA0123456",
      vatNo: "4123456789",
      taxPin: "••••••••",
      bbbeeLevel: "Level 1 EME",
      address: "The Innovation Hub, Pretoria, Gauteng",
      email: "nsomdyala@maxattention.tech",
      phone: "+27 12 000 0000",
    },
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

function withSettingsDefaults(bundle: SettingsBundle): SettingsBundle {
  return {
    ...bundle,
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
    if (
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
  settings.company = company;
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
