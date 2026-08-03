import { countTermHits, DEFAULT_LANE_KEYWORDS } from "@/lib/intake/match/keywords";
import type { OppLane } from "@/lib/opportunities/types";

export type LaneMatchResult = {
  lane: OppLane;
  relevanceScore: number;
  lowRelevance: boolean;
  scores: Partial<Record<OppLane, number>>;
};

type KeywordLane = { lane: string; terms: string[] };

export function matchLanes(
  matchText: string,
  configured?: KeywordLane[],
): LaneMatchResult {
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
    // de-dupe terms
    const unique = [...new Set(terms.map((t) => t.toLowerCase()))];
    scores[lane] = countTermHits(matchText, unique);
  }

  let best: Exclude<OppLane, "Other"> = "ICT / IS";
  let bestScore = -1;
  for (const lane of lanes) {
    const s = scores[lane] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = lane;
    }
  }

  if (bestScore <= 0) {
    return {
      lane: "Other",
      relevanceScore: 0,
      lowRelevance: true,
      scores,
    };
  }

  // Cap at 100; weight hits (roughly 12 pts each, soft cap)
  const relevanceScore = Math.min(100, bestScore * 12);
  return {
    lane: best,
    relevanceScore,
    lowRelevance: false,
    scores,
  };
}
