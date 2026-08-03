import "server-only";

import { fetchOcdsReleaseByOcid } from "@/lib/intake/adapters/etenders/client";
import { mapOcdsRelease } from "@/lib/intake/adapters/etenders/map";
import { updateOpportunity } from "@/lib/opportunities/store";
import type {
  Opportunity,
  OpportunityDocumentLink,
} from "@/lib/opportunities/types";

/**
 * When intake stored a tender without document links, pull the single OCDS
 * release (which often includes Download URLs) and persist them.
 */
export async function enrichTenderDocuments(
  opportunity: Opportunity,
): Promise<Opportunity> {
  if (opportunity.documentLinks?.length) return opportunity;
  const ocid = opportunity.externalId?.trim();
  if (!ocid) return opportunity;

  try {
    const release = await fetchOcdsReleaseByOcid(ocid);
    if (!release) return opportunity;
    const normalised = mapOcdsRelease(release);
    const documentLinks: OpportunityDocumentLink[] = normalised.documents.map(
      (d) => ({
        title: d.title,
        url: d.url,
        format: d.format,
      }),
    );
    if (documentLinks.length === 0) return opportunity;

    const patch: Partial<Opportunity> = {
      documentLinks,
      sourceUrl:
        opportunity.sourceUrl ||
        `https://ocds-api.etenders.gov.za/api/OCDSReleases/release/${encodeURIComponent(ocid)}`,
    };

    // Prefer tender reference number from OCDS when we only stored the OCID.
    if (
      normalised.refNo &&
      (opportunity.refNo === ocid || opportunity.refNo.startsWith("ocds-"))
    ) {
      patch.refNo = normalised.refNo;
    }
    if (normalised.title && normalised.title !== "Untitled tender") {
      // Keep list title; only fill empty description extras already present
    }
    if (!opportunity.description && normalised.description) {
      patch.description = normalised.description;
    }
    if (!opportunity.contactName && normalised.contact?.name) {
      patch.contactName = normalised.contact.name;
      patch.contactEmail = normalised.contact.email;
      patch.contactPhone = normalised.contact.telephone;
    }

    const updated = await updateOpportunity(opportunity.id, patch);
    return updated ?? { ...opportunity, ...patch, documentLinks };
  } catch (err) {
    console.error("enrich tender documents failed", err);
    return opportunity;
  }
}
