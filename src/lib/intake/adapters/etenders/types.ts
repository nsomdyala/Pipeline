/** Partial OCDS 1.1 typings for the eTenders public API. */

export type OcdsDocument = {
  id?: string;
  documentType?: string;
  title?: string;
  description?: string;
  url?: string;
  format?: string;
  datePublished?: string;
};

export type OcdsBriefingSession = {
  isSession?: boolean;
  compulsory?: boolean;
  date?: string;
  venue?: string;
};

export type OcdsContactPerson = {
  name?: string;
  email?: string;
  telephoneNumber?: string;
};

export type OcdsFrameworkAgreement = {
  maximumParticipants?: number;
  periodRationale?: string;
};

export type OcdsTechniques = {
  hasFrameworkAgreement?: boolean;
  frameworkAgreement?: OcdsFrameworkAgreement;
};

export type OcdsTender = {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  procuringEntity?: { name?: string; id?: string };
  mainProcurementCategory?: string;
  additionalProcurementCategories?: string[];
  classification?: { description?: string; id?: string; scheme?: string };
  province?: string;
  procurementMethod?: string;
  procurementMethodDetails?: string;
  tenderPeriod?: { startDate?: string; endDate?: string };
  contractPeriod?: { startDate?: string; endDate?: string; durationInDays?: number };
  value?: { amount?: number; currency?: string };
  documents?: OcdsDocument[];
  briefingSession?: OcdsBriefingSession;
  contactPerson?: OcdsContactPerson;
  techniques?: OcdsTechniques;
};

export type OcdsRelease = {
  ocid?: string;
  id?: string;
  date?: string;
  tag?: string[];
  initiationType?: string;
  buyer?: { name?: string; id?: string };
  tender?: OcdsTender;
};

export type OcdsReleasePackage = {
  uri?: string;
  version?: string;
  publishedDate?: string;
  releases?: OcdsRelease[];
  links?: { next?: string };
};
