import type {
  OcdsRelease,
  OcdsReleasePackage,
} from "@/lib/intake/adapters/etenders/types";

export const ETENDERS_BASE = "https://ocds-api.etenders.gov.za";
/** eTenders often returns ~400/page even when PageSize=1000 — follow links.next. */
const PAGE_SIZE = 200;
const MAX_PAGES = 100;
const MAX_RETRIES = 4;

export class EtendersUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EtendersUnavailableError";
  }
}

export type OcdsPageMeta = {
  page: number;
  url: string;
  status: number;
  releaseCount: number;
  hasNext: boolean;
  nextUrl: string | null;
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithStatus<T>(
  url: string,
): Promise<{ status: number; body: T }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.info(`[etenders] GET ${url} (attempt ${attempt + 1})`);
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Pipeline-AuraWorkstream/1.0 (+maxattention.tech)",
        },
        cache: "no-store",
      });

      if (res.status >= 500) {
        lastError = new Error(`eTenders 5xx (${res.status}) for ${url}`);
        console.warn(`[etenders] ${lastError.message}`);
        await sleep(500 * 2 ** attempt);
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new EtendersUnavailableError(
          `eTenders HTTP ${res.status} for ${url}${text ? ` · ${text.slice(0, 160)}` : ""}`,
        );
      }

      const body = (await res.json()) as T;
      return { status: res.status, body };
    } catch (err) {
      if (err instanceof EtendersUnavailableError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[etenders] fetch error: ${lastError.message}`);
      await sleep(500 * 2 ** attempt);
    }
  }

  throw new EtendersUnavailableError(
    lastError?.message ?? "eTenders unavailable after retries",
  );
}

function pageUrl(dateFrom: string, dateTo: string, page: number) {
  const params = new URLSearchParams({
    PageNumber: String(page),
    PageSize: String(PAGE_SIZE),
    dateFrom,
    dateTo,
  });
  return `${ETENDERS_BASE}/api/OCDSReleases?${params}`;
}

/**
 * Paginate OCDS releases. IMPORTANT: eTenders sets links.next even when the
 * page has fewer than PageSize items — do NOT stop on short pages.
 * Calls onPage after each successful page so callers can upsert incrementally.
 */
export async function fetchOcdsReleasesPaged(
  dateFrom: string,
  dateTo: string,
  onPage: (releases: OcdsRelease[], meta: OcdsPageMeta) => Promise<void>,
): Promise<{ fetched: number; pages: number }> {
  let fetched = 0;
  let pages = 0;
  let nextUrl: string | null = pageUrl(dateFrom, dateTo, 1);
  const seenUrls = new Set<string>();

  while (nextUrl && pages < MAX_PAGES) {
    if (seenUrls.has(nextUrl)) {
      console.warn(`[etenders] pagination loop detected at ${nextUrl}`);
      break;
    }
    seenUrls.add(nextUrl);

    const pageResponse = await fetchJsonWithStatus<OcdsReleasePackage>(
      nextUrl,
    );
    const status = pageResponse.status;
    const pack: OcdsReleasePackage = pageResponse.body;
    const releases = pack.releases ?? [];
    const hasNext = Boolean(pack.links?.next);
    const resolvedNext: string | null = pack.links?.next?.trim() || null;

    pages += 1;
    const meta: OcdsPageMeta = {
      page: pages,
      url: nextUrl,
      status,
      releaseCount: releases.length,
      hasNext,
      nextUrl: resolvedNext,
    };
    console.info(
      `[etenders] page ${pages}: HTTP ${status}, ${releases.length} releases, hasNext=${hasNext}`,
    );

    if (releases.length > 0) {
      await onPage(releases, meta);
      fetched += releases.length;
    }

    // Prefer official next link; fall back to PageNumber++ only if hasNext
    // is true but next is missing (shouldn't happen with this API).
    if (resolvedNext) {
      nextUrl = resolvedNext;
    } else if (hasNext && releases.length > 0) {
      nextUrl = pageUrl(dateFrom, dateTo, pages + 1);
    } else {
      nextUrl = null;
    }

    if (releases.length === 0) break;
  }

  console.info(
    `[etenders] fetch complete: pages=${pages}, releases=${fetched}, dateFrom=${dateFrom}, dateTo=${dateTo}`,
  );
  return { fetched, pages };
}

/**
 * Convenience: collect all releases into memory (tests / small windows).
 * Production intake should use fetchOcdsReleasesPaged + incremental upsert.
 */
export async function fetchOcdsReleases(
  dateFrom: string,
  dateTo: string,
): Promise<OcdsRelease[]> {
  const all: OcdsRelease[] = [];
  await fetchOcdsReleasesPaged(dateFrom, dateTo, async (releases) => {
    all.push(...releases);
  });
  return all;
}

export async function fetchOcdsReleaseByOcid(
  ocid: string,
): Promise<OcdsRelease | null> {
  const url = `${ETENDERS_BASE}/api/OCDSReleases/release/${encodeURIComponent(ocid)}`;
  const { body: pack } = await fetchJsonWithStatus<
    OcdsReleasePackage | OcdsRelease
  >(url);
  if ("releases" in pack && Array.isArray(pack.releases)) {
    return pack.releases[0] ?? null;
  }
  if ("ocid" in pack) return pack as OcdsRelease;
  return null;
}
