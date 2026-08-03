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
};

export const USER_ROLES = ["admin", "member", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
};
