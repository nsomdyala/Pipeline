import { createHash } from "node:crypto";
import { ETENDERS_BASE } from "@/lib/intake/adapters/etenders/client";
import type { OcdsRelease } from "@/lib/intake/adapters/etenders/types";
import type { NormalisedOpportunity } from "@/lib/intake/types";

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

/**
 * Parse an OCDS datetime into a UTC ISO instant.
 * eTenders sends full ISO values (usually with Z). We never substitute
 * publication date / enquiryPeriod for closing.
 */
export function parseOcdsInstant(value: string | null | undefined): string | null {
  const raw = str(value);
  if (!raw) return null;
  // Ignore eTenders sentinel empties.
  if (raw.startsWith("0001-01-01")) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function mapOcdsRelease(raw: OcdsRelease): NormalisedOpportunity {
  const tender = raw.tender ?? {};
  const ocid = str(raw.ocid);
  if (!ocid) {
    throw new Error("OCDS release missing ocid");
  }

  const title = str(tender.title) ?? "Untitled tender";
  const description = str(tender.description) ?? "";
  const buyer =
    str(raw.buyer?.name) ??
    str(tender.procuringEntity?.name) ??
    "Unknown buyer";

  // PRIMARY: official eTenders taxonomy on tender.category
  // FALLBACK: coarse OCDS mainProcurementCategory / classification (rarely useful)
  const etendersCategory = str(tender.category);
  const ocdsMain =
    str(tender.mainProcurementCategory) ??
    (tender.additionalProcurementCategories ?? [])
      .map((c) => str(c))
      .find(Boolean) ??
    str(tender.classification?.description);
  const category = etendersCategory ?? ocdsMain ?? null;

  const amount = tender.value?.amount;
  const estimatedValue =
    typeof amount === "number" && Number.isFinite(amount) && amount > 0
      ? amount
      : null;

  const documents = (tender.documents ?? [])
    .filter((d) => str(d.url))
    .map((d) => ({
      title: str(d.title) ?? str(d.documentType) ?? "Document",
      url: str(d.url)!,
      format: str(d.format) ?? undefined,
    }));

  const briefingDate = parseOcdsInstant(tender.briefingSession?.date);
  const briefing = tender.briefingSession
    ? {
        isSession: Boolean(tender.briefingSession.isSession),
        compulsory: Boolean(tender.briefingSession.compulsory),
        date: briefingDate,
        venue: str(tender.briefingSession.venue),
      }
    : null;

  const contact = tender.contactPerson
    ? {
        name: str(tender.contactPerson.name),
        email: str(tender.contactPerson.email),
        telephone: str(tender.contactPerson.telephoneNumber),
      }
    : null;

  const framework = tender.techniques?.frameworkAgreement;
  const panelTerm =
    str(framework?.periodRationale) ??
    (tender.contractPeriod?.startDate && tender.contractPeriod?.endDate
      ? `${tender.contractPeriod.startDate} → ${tender.contractPeriod.endDate}`
      : null);

  // Closing MUST come from tenderPeriod.endDate only.
  const closingAt = parseOcdsInstant(tender.tenderPeriod?.endDate);
  const procurementMethod = str(tender.procurementMethod);
  const procurementMethodDetails = str(tender.procurementMethodDetails);
  const tenderId = str(tender.id);

  const matchText = [title, description, category ?? ""].join("\n");
  const contentHash = createHash("sha256")
    .update(
      JSON.stringify({
        ocid,
        title,
        description,
        buyer,
        category,
        closingAt,
        amount: estimatedValue,
        province: tender.province ?? null,
        hasFrameworkAgreement: tender.techniques?.hasFrameworkAgreement ?? null,
        procurementMethod,
        procurementMethodDetails,
        docs: documents.map((d) => d.url),
      }),
    )
    .digest("hex")
    .slice(0, 32);

  // eTenders often puts a numeric internal id in tender.id; the buyer
  // reference usually lives in title (e.g. TNPA/…/RFP, MMSEZ/INF/…).
  const titleLooksLikeRef =
    title.length <= 64 && !/\s{2,}/.test(title) && title !== "Untitled tender";
  const humanRef =
    (tenderId && !/^\d+$/.test(tenderId) ? tenderId : null) ??
    (titleLooksLikeRef ? title : null) ??
    ocid;

  return {
    externalId: ocid,
    // Prefer the human tender / RFQ number; keep OCID as externalId for dedupe.
    refNo: humanRef,
    sourceKey: "etenders",
    sourceLabel: "eTenders",
    sector: "public",
    buyer,
    title,
    description,
    closingAt,
    publishedAt: parseOcdsInstant(raw.date),
    province: str(tender.province),
    category,
    ocdsMainCategory: ocdsMain,
    estimatedValue,
    currency: str(tender.value?.currency) ?? "ZAR",
    documents,
    briefing,
    contact,
    sourceUrl: `${ETENDERS_BASE}/api/OCDSReleases/release/${encodeURIComponent(ocid)}`,
    contentHash,
    hasFrameworkAgreement: tender.techniques?.hasFrameworkAgreement ?? null,
    panelMaxParticipants:
      typeof framework?.maximumParticipants === "number"
        ? framework.maximumParticipants
        : null,
    panelTerm,
    matchText,
    tenderId,
    procurementMethod,
    procurementMethodDetails,
  };
}
