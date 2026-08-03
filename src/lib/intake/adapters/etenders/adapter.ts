import {
  fetchOcdsReleases,
} from "@/lib/intake/adapters/etenders/client";
import { mapOcdsRelease } from "@/lib/intake/adapters/etenders/map";
import type { OcdsRelease } from "@/lib/intake/adapters/etenders/types";
import type {
  NormalisedOpportunity,
  RawItem,
  SourceAdapter,
} from "@/lib/intake/types";

/**
 * National Treasury eTenders — public OCDS API (PDDL).
 * Fetch + normalise only; pipeline owns dedupe/match/upsert/notify.
 */
export const etendersAdapter: SourceAdapter = {
  name: "etenders",
  sector: "public",
  sourceLabel: "eTenders",

  async fetch(dateFrom: string, dateTo: string): Promise<RawItem[]> {
    return fetchOcdsReleases(dateFrom, dateTo);
  },

  normalise(raw: RawItem): NormalisedOpportunity {
    return mapOcdsRelease(raw as OcdsRelease);
  },
};
