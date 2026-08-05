import type { CategoryLaneMapping } from "@/lib/intake/config/etenders-categories";

export type BankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
};

export type CompanyProfile = {
  name: string;
  tradingAs: string;
  regNo: string;
  csdNo: string;
  vatNo: string;
  taxPin: string;
  bbbeeLevel: string;
  address: string;
  email: string;
  phone: string;
  tagline: string;
  website: string;
  foundedYear: string;
  directors: string;
  provinces: string;
  about: string;
  vision: string;
  mission: string;
  bankDetails: BankDetails;
};

export const EMPTY_BANK_DETAILS: BankDetails = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  branchCode: "",
};

export function withCompanyDefaults(
  company: Partial<CompanyProfile> & Pick<CompanyProfile, "name">,
): CompanyProfile {
  return {
    name: company.name,
    tradingAs: company.tradingAs ?? "",
    regNo: company.regNo ?? "",
    csdNo: company.csdNo ?? "",
    vatNo: company.vatNo ?? "",
    taxPin: company.taxPin ?? "",
    bbbeeLevel: company.bbbeeLevel ?? "",
    address: company.address ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    tagline: company.tagline ?? "",
    website: company.website ?? "",
    foundedYear: company.foundedYear ?? "",
    directors: company.directors ?? "",
    provinces: company.provinces ?? "",
    about: company.about ?? "",
    vision: company.vision ?? "",
    mission: company.mission ?? "",
    bankDetails: {
      ...EMPTY_BANK_DETAILS,
      ...(company.bankDetails ?? {}),
    },
  };
}

/**
 * Legacy system roles used throughout the app.
 * Additive: `client` (Client-portal) is also a system role key in permissions,
 * but kept out of USER_ROLES so existing admin|member|viewer call sites stay stable.
 * Assignable roles for users come from app_roles (system + custom).
 */
export const USER_ROLES = ["admin", "member", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type AppUser = {
  id: string;
  name: string;
  email: string;
  /** System or custom role key. */
  role: string;
  avatarUrl?: string | null;
  status?: "active" | "invited" | "suspended" | "deactivated";
  lastActiveAt?: string | null;
  createdAt?: string | null;
};

export type PortalWatchItem = {
  id: string;
  companyName: string;
  portalUrl: string;
  industry: string;
  registrationStatus: string;
};

export type SettingsBundle = {
  company: CompanyProfile;
  users: AppUser[];
  portals: PortalWatchItem[];
  keywords: { lane: string; terms: string[] }[];
  /** Official eTenders category → lane; edit here to add/remove without code changes. */
  categoryLaneMap: CategoryLaneMapping[];
  /** Pre-selected categories for board / All Tenders filters. */
  defaultEtendersCategories: string[];
};
