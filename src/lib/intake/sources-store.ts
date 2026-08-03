import { readJsonFile, writeJsonFile } from "@/lib/json-store";

export type SourceRunStatus = "ok" | "degraded" | "error" | "idle";

export type SourceState = {
  key: string;
  name: string;
  sector: "public" | "private";
  enabled: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: SourceRunStatus;
  lastError: string | null;
  lastFetched: number;
  lastCreated: number;
  lastAmended: number;
};

type SourcesBundle = {
  sources: SourceState[];
};

const FILE = "intake-sources.json";

/** In-memory fallback when the filesystem is read-only (Vercel). */
let memoryBundle: SourcesBundle | null = null;

function seed(): SourcesBundle {
  return {
    sources: [
      {
        key: "etenders",
        name: "eTenders (OCDS)",
        sector: "public",
        enabled: true,
        lastRunAt: null,
        lastSuccessAt: null,
        lastStatus: "idle",
        lastError: null,
        lastFetched: 0,
        lastCreated: 0,
        lastAmended: 0,
      },
    ],
  };
}

export async function getSourcesBundle() {
  try {
    const existing = await readJsonFile<SourcesBundle | null>(FILE, null);
    if (existing?.sources?.length) {
      memoryBundle = existing;
      return existing;
    }
    const seeded = seed();
    memoryBundle = seeded;
    try {
      await writeJsonFile(FILE, seeded);
    } catch {
      // read-only FS
    }
    return seeded;
  } catch {
    if (!memoryBundle) memoryBundle = seed();
    return memoryBundle;
  }
}

export async function getSource(key: string) {
  const bundle = await getSourcesBundle();
  return bundle.sources.find((s) => s.key === key) ?? null;
}

export async function updateSource(
  key: string,
  patch: Partial<SourceState>,
): Promise<SourceState> {
  const bundle = await getSourcesBundle();
  const index = bundle.sources.findIndex((s) => s.key === key);
  if (index < 0) {
    const created: SourceState = {
      key,
      name: key,
      sector: "public",
      enabled: true,
      lastRunAt: null,
      lastSuccessAt: null,
      lastStatus: "idle",
      lastError: null,
      lastFetched: 0,
      lastCreated: 0,
      lastAmended: 0,
      ...patch,
    };
    bundle.sources.push(created);
    memoryBundle = bundle;
    try {
      await writeJsonFile(FILE, bundle);
    } catch {
      // read-only FS
    }
    return created;
  }
  bundle.sources[index] = { ...bundle.sources[index], ...patch };
  memoryBundle = bundle;
  try {
    await writeJsonFile(FILE, bundle);
  } catch {
    // read-only FS
  }
  return bundle.sources[index];
}
