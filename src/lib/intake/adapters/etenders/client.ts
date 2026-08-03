import type { OcdsRelease, OcdsReleasePackage } from "@/lib/intake/adapters/etenders/types";

export const ETENDERS_BASE = "https://ocds-api.etenders.gov.za";
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const MAX_RETRIES = 4;

export class EtendersUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EtendersUnavailableError";
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Pipeline-AuraWorkstream/1.0 (+maxattention.tech)",
        },
        cache: "no-store",
      });

      if (res.status >= 500) {
        lastError = new Error(`eTenders 5xx (${res.status})`);
        await sleep(500 * 2 ** attempt);
        continue;
      }

      if (!res.ok) {
        throw new EtendersUnavailableError(
          `eTenders HTTP ${res.status} for ${url}`,
        );
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof EtendersUnavailableError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      await sleep(500 * 2 ** attempt);
    }
  }

  throw new EtendersUnavailableError(
    lastError?.message ?? "eTenders unavailable after retries",
  );
}

/**
 * Paginate OCDS releases published between dateFrom and dateTo.
 * dateFrom/dateTo filter on publication date (API semantics).
 */
export async function fetchOcdsReleases(
  dateFrom: string,
  dateTo: string,
): Promise<OcdsRelease[]> {
  const all: OcdsRelease[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      PageNumber: String(page),
      PageSize: String(PAGE_SIZE),
      dateFrom,
      dateTo,
    });
    const url = `${ETENDERS_BASE}/api/OCDSReleases?${params}`;
    const pack = await fetchJson<OcdsReleasePackage>(url);
    const releases = pack.releases ?? [];
    if (releases.length === 0) break;
    all.push(...releases);
    if (releases.length < PAGE_SIZE) break;
  }

  return all;
}

export async function fetchOcdsReleaseByOcid(
  ocid: string,
): Promise<OcdsRelease | null> {
  const url = `${ETENDERS_BASE}/api/OCDSReleases/release/${encodeURIComponent(ocid)}`;
  const pack = await fetchJson<OcdsReleasePackage | OcdsRelease>(url);
  if ("releases" in pack && Array.isArray(pack.releases)) {
    return pack.releases[0] ?? null;
  }
  if ("ocid" in pack) return pack as OcdsRelease;
  return null;
}
