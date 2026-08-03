import {
  laneForEtendersCategory,
  type CategoryLaneMapping,
} from "@/lib/intake/config/etenders-categories";
import {
  countTermHits,
  DEFAULT_LANE_KEYWORDS,
} from "@/lib/intake/match/keywords";
import type { OppLane } from "@/lib/opportunities/types";

export type LaneMatchResult = {
  lane: OppLane;
  relevanceScore: number;
  lowRelevance: boolean;
  matchVia: "category" | "keyword" | "none";
  etendersCategory: string | null;
  scores: Partial<Record<OppLane, number>>;
};

type KeywordLane = { lane: string; terms: string[] };

function keywordScores(
  matchText: string,
  configured?: KeywordLane[],
): Partial<Record<OppLane, number>> {
  const scores: Partial<Record<OppLane, number>> = {};
  const lanes = Object.keys(DEFAULT_LANE_KEYWORDS) as Exclude<
    OppLane,
    "Other"
  >[];

  for (const lane of lanes) {
    const fromConfig = configured?.find((k) => k.lane === lane)?.terms;
    const terms =
      fromConfig && fromConfig.length > 0
        ? [...DEFAULT_LANE_KEYWORDS[lane], ...fromConfig]
        : DEFAULT_LANE_KEYWORDS[lane];
    const unique = [...new Set(terms.map((t) => t.toLowerCase()))];
    scores[lane] = countTermHits(matchText, unique);
  }
  return scores;
}

function bestKeywordLane(
  scores: Partial<Record<OppLane, number>>,
): { lane: Exclude<OppLane, "Other">; score: number } | null {
  const lanes = Object.keys(DEFAULT_LANE_KEYWORDS) as Exclude<
    OppLane,
    "Other"
  >[];
  let best: Exclude<OppLane, "Other"> | null = null;
  let bestScore = 0;
  for (const lane of lanes) {
    const s = scores[lane] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = lane;
    }
  }
  return best && bestScore > 0 ? { lane: best, score: bestScore } : null;
}

/**
 * Lane matching:
 * 1. PRIMARY — official eTenders `tender.category` against configurable map
 * 2. FALLBACK — keyword lists (always used for Asset management; used for all
 *    lanes when category is missing / unmapped)
 */
export function matchLanes(input: {
  etendersCategory: string | null;
  matchText: string;
  categoryLaneMap?: CategoryLaneMapping[];
  keywords?: KeywordLane[];
}): LaneMatchResult {
  const etendersCategory = input.etendersCategory?.trim() || null;
  const scores = keywordScores(input.matchText, input.keywords);

  const categoryLane = laneForEtendersCategory(
    etendersCategory,
    input.categoryLaneMap,
  );

  if (categoryLane) {
    // Asset is poorly covered by eTenders taxonomy — keyword hit can still win.
    const assetHits = scores["Asset management"] ?? 0;
    if (assetHits > 0 && assetHits >= (scores[categoryLane] ?? 0)) {
      return {
        lane: "Asset management",
        relevanceScore: Math.min(100, 70 + assetHits * 8),
        lowRelevance: false,
        matchVia: "keyword",
        etendersCategory,
        scores,
      };
    }
    return {
      lane: categoryLane,
      relevanceScore: 90,
      lowRelevance: false,
      matchVia: "category",
      etendersCategory,
      scores,
    };
  }

  const kw = bestKeywordLane(scores);
  if (!kw) {
    return {
      lane: "Other",
      relevanceScore: 0,
      lowRelevance: true,
      matchVia: "none",
      etendersCategory,
      scores,
    };
  }

  return {
    lane: kw.lane,
    relevanceScore: Math.min(100, kw.score * 12),
    lowRelevance: false,
    matchVia: "keyword",
    etendersCategory,
    scores,
  };
}
