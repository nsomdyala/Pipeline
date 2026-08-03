import { createHash } from "node:crypto";
import { ETENDERS_BASE } from "@/lib/intake/adapters/etenders/client";
import type { OcdsRelease } from "@/lib/intake/adapters/etenders/types";
import type { NormalisedOpportunity } from "@/lib/intake/types";

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

function detectProcurementHint(
  tender: OcdsRelease["tender"],
  title: string,
  description: string,
): "tender" | "rfq" | null {
  const blob = `${title} ${description} ${tender?.procurementMethodDetails ?? ""} ${tender?.procurementMethod ?? ""}`.toLowerCase();
  if (/\brfq\b|request for quotation/.test(blob)) return "rfq";
  if (/\brfp\b|tender|bid\b/.test(blob)) return "tender";
  return null;
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

  const briefing = tender.briefingSession
    ? {
        isSession: Boolean(tender.briefingSession.isSession),
        compulsory: Boolean(tender.briefingSession.compulsory),
        date: str(tender.briefingSession.date),
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

  const matchText = [title, description, category ?? ""].join("\n");
  const contentHash = createHash("sha256")
    .update(
      JSON.stringify({
        ocid,
        title,
        description,
        buyer,
        category,
        closingAt: tender.tenderPeriod?.endDate ?? null,
        amount: estimatedValue,
        province: tender.province ?? null,
        hasFrameworkAgreement: tender.techniques?.hasFrameworkAgreement ?? null,
        docs: documents.map((d) => d.url),
      }),
    )
    .digest("hex")
    .slice(0, 32);

  const tenderRef = str(tender.id);

  return {
    externalId: ocid,
    // Prefer the human tender / RFQ number; keep OCID as externalId for dedupe.
    refNo: tenderRef ?? ocid,
    sourceKey: "etenders",
    sourceLabel: "eTenders",
    sector: "public",
    buyer,
    title,
    description,
    closingAt: str(tender.tenderPeriod?.endDate),
    publishedAt: str(raw.date),
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
    procurementHint: detectProcurementHint(tender, title, description),
  };
}
