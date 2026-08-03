import "server-only";

import type { TenderSearchQuery, TenderSearchResult } from "@/lib/opportunities/search";

type CacheEntry = {
  expires: number;
  value: TenderSearchResult;
};

const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

function keyFor(query: TenderSearchQuery): string {
  return JSON.stringify(query);
}

export function getCachedTenderSearch(
  query: TenderSearchQuery,
): TenderSearchResult | null {
  const key = keyFor(query);
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedTenderSearch(
  query: TenderSearchQuery,
  value: TenderSearchResult,
) {
  // Keep memory bounded.
  if (cache.size > 40) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(keyFor(query), { expires: Date.now() + TTL_MS, value });
}
