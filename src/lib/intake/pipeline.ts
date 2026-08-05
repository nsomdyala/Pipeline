import { matchLanes } from "@/lib/intake/match/lanes";
import { matchPanel } from "@/lib/intake/match/panels";
import { getSource, updateSource } from "@/lib/intake/sources-store";
import type {
  IntakeRunResult,
  NormalisedOpportunity,
  SourceAdapter,
} from "@/lib/intake/types";
import {
  EtendersUnavailableError,
  fetchOcdsReleasesPaged,
} from "@/lib/intake/adapters/etenders/client";
import { mapOcdsRelease } from "@/lib/intake/adapters/etenders/map";
import type { OcdsRelease } from "@/lib/intake/adapters/etenders/types";
import { createMessage, listChannels } from "@/lib/chat/store";
import {
  createOpportunitiesFromIntake,
  createOpportunityFromIntake,
  findByExternalId,
  findByExternalIds,
  updateOpportunityFromIntake,
} from "@/lib/opportunities/store";
import type { Opportunity } from "@/lib/opportunities/types";
import { getSettings } from "@/lib/settings/store";
import { defaultEtendersCategories } from "@/lib/intake/config/etenders-categories";

function johannesburgDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function daysAgoIsoDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return johannesburgDate(d);
}

function shouldNotify(opp: Opportunity) {
  return opp.isPanel || (!opp.lowRelevance && opp.relevanceScore > 0);
}

async function notifyOpportunity(opp: Opportunity, kind: "new" | "amended") {
  if (kind === "amended") return;
  if (!shouldNotify(opp)) return;

  try {
    const channels = await listChannels();
    const channel =
      channels.find((c) => c.name === "opportunities") ?? channels[0];
    if (!channel) return;

    const prefix = opp.isPanel ? "PANEL · " : "";
    const score =
      opp.relevanceScore > 0 ? ` · relevance ${opp.relevanceScore}` : "";
    const body = `${prefix}New ${opp.opportunityType.toUpperCase()} from ${opp.source}: ${opp.refNo} — ${opp.title} (${opp.buyer})${score}. Lane: ${opp.lane}.`;

    await createMessage({
      channelId: channel.id,
      authorName: "Pipeline Bot",
      body,
    });
  } catch (err) {
    console.warn(
      "[intake] notify skipped:",
      err instanceof Error ? err.message : err,
    );
  }
}

function applyMatch(
  normalised: NormalisedOpportunity,
  settings: {
    keywords: { lane: string; terms: string[] }[];
    categoryLaneMap: import("@/lib/intake/config/etenders-categories").CategoryLaneMapping[];
  },
) {
  const lane = matchLanes({
    etendersCategory: normalised.category,
    matchText: normalised.matchText,
    categoryLaneMap: settings.categoryLaneMap,
    keywords: settings.keywords,
  });
  const panel = matchPanel(normalised);
  return { lane, panel };
}

type IntakeSettings = {
  keywords: { lane: string; terms: string[] }[];
  categoryLaneMap: import("@/lib/intake/config/etenders-categories").CategoryLaneMapping[];
};

async function upsertRelease(
  normalised: NormalisedOpportunity,
  settings: IntakeSettings,
  result: IntakeRunResult,
) {
  const { lane, panel } = applyMatch(normalised, settings);
  const existing = await findByExternalId(normalised.externalId);

  if (!existing) {
    const created = await createOpportunityFromIntake({
      normalised,
      lane: lane.lane,
      relevanceScore: lane.relevanceScore,
      lowRelevance: lane.lowRelevance,
      matchVia: lane.matchVia,
      opportunityType: panel.opportunityType,
      isPanel: panel.isPanel,
      panelMaxParticipants: panel.panelMaxParticipants,
      panelTerm: panel.panelTerm,
    });
    result.created += 1;
    if (shouldNotify(created)) {
      await notifyOpportunity(created, "new");
      result.notified += 1;
    }
    return;
  }

  if (existing.contentHash === normalised.contentHash) {
    const closingChanged =
      Boolean(normalised.closingAt) &&
      normalised.closingAt !== existing.closingAt;
    const typeChanged =
      existing.opportunityType !== panel.opportunityType ||
      existing.isPanel !== panel.isPanel;
    if (closingChanged || typeChanged) {
      const { updateOpportunity } = await import("@/lib/opportunities/store");
      await updateOpportunity(existing.id, {
        closingAt: normalised.closingAt ?? existing.closingAt,
        opportunityType: panel.opportunityType,
        isPanel: panel.isPanel,
        panelMaxParticipants: panel.panelMaxParticipants,
        panelTerm: panel.panelTerm,
        category: normalised.category,
      });
      result.amended += 1;
    } else {
      result.unchanged += 1;
    }
    return;
  }

  const amended = await updateOpportunityFromIntake(existing.id, {
    normalised,
    lane: lane.lane,
    relevanceScore: lane.relevanceScore,
    lowRelevance: lane.lowRelevance,
    matchVia: lane.matchVia,
    opportunityType: panel.opportunityType,
    isPanel: panel.isPanel,
    panelMaxParticipants: panel.panelMaxParticipants,
    panelTerm: panel.panelTerm,
  });
  if (amended) {
    result.amended += 1;
    await notifyOpportunity(amended, "amended");
  }
}

/** Batch upsert one eTenders page — one SELECT + chunked INSERT + sparse updates. */
async function upsertReleasePage(
  items: NormalisedOpportunity[],
  settings: IntakeSettings,
  result: IntakeRunResult,
) {
  if (items.length === 0) return;

  const existingMap = await findByExternalIds(
    items.map((item) => item.externalId),
  );
  const toCreate: Parameters<typeof createOpportunitiesFromIntake>[0] = [];

  for (const normalised of items) {
    const { lane, panel } = applyMatch(normalised, settings);
    const fields = {
      normalised,
      lane: lane.lane,
      relevanceScore: lane.relevanceScore,
      lowRelevance: lane.lowRelevance,
      matchVia: lane.matchVia,
      opportunityType: panel.opportunityType,
      isPanel: panel.isPanel,
      panelMaxParticipants: panel.panelMaxParticipants,
      panelTerm: panel.panelTerm,
    };
    const existing = existingMap.get(normalised.externalId);

    if (!existing) {
      toCreate.push(fields);
      continue;
    }

    if (existing.contentHash === normalised.contentHash) {
      const closingChanged =
        Boolean(normalised.closingAt) &&
        normalised.closingAt !== existing.closingAt;
      const typeChanged =
        existing.opportunityType !== panel.opportunityType ||
        existing.isPanel !== panel.isPanel;
      if (closingChanged || typeChanged) {
        try {
          const { updateOpportunity } = await import(
            "@/lib/opportunities/store"
          );
          await updateOpportunity(existing.id, {
            closingAt: normalised.closingAt ?? existing.closingAt,
            opportunityType: panel.opportunityType,
            isPanel: panel.isPanel,
            panelMaxParticipants: panel.panelMaxParticipants,
            panelTerm: panel.panelTerm,
            category: normalised.category,
          });
          result.amended += 1;
        } catch (err) {
          result.errors.push(
            err instanceof Error ? err.message : "Light update failed",
          );
        }
      } else {
        result.unchanged += 1;
      }
      continue;
    }

    try {
      const amended = await updateOpportunityFromIntake(existing.id, fields);
      if (amended) result.amended += 1;
    } catch (err) {
      result.errors.push(
        err instanceof Error ? err.message : "Upsert failed",
      );
    }
  }

  if (toCreate.length > 0) {
    try {
      const created = await createOpportunitiesFromIntake(toCreate);
      result.created += created.length;
      // Skip per-row chat notify on bulk intake — too slow over the pooler.
    } catch (err) {
      const message = err instanceof Error ? err.message : "Batch create failed";
      result.errors.push(message);
      console.error(`[intake] batch create failed: ${message}`);
      // Fall back to per-row so a single bad row doesn't drop the page.
      for (const fields of toCreate) {
        try {
          await createOpportunityFromIntake(fields);
          result.created += 1;
        } catch (rowErr) {
          result.errors.push(
            rowErr instanceof Error ? rowErr.message : "Create failed",
          );
        }
      }
    }
  }
}

/**
 * Shared intake pipeline: fetch pages → normalise → upsert incrementally.
 * Never wipes existing rows on failure — last-good data stays in Postgres.
 */
export async function runIntake(
  adapter: SourceAdapter,
  options?: { dateFrom?: string; dateTo?: string },
): Promise<IntakeRunResult> {
  const source = await getSource(adapter.name);
  const dateTo = options?.dateTo ?? johannesburgDate();
  // Wide default window so first/manual runs actually populate.
  const dateFrom = options?.dateFrom ?? daysAgoIsoDate(60);

  const result: IntakeRunResult = {
    sourceKey: adapter.name,
    fetched: 0,
    normalised: 0,
    created: 0,
    amended: 0,
    unchanged: 0,
    notified: 0,
    defaultCategoryHits: 0,
    errors: [],
    status: "ok",
    dateFrom,
    dateTo,
  };

  console.info(
    `[intake] start source=${adapter.name} dateFrom=${dateFrom} dateTo=${dateTo} DATABASE_URL=${process.env.DATABASE_URL ? "set" : "MISSING"}`,
  );

  if (!process.env.DATABASE_URL?.trim()) {
    const message =
      "DATABASE_URL is not set — intake cannot write to Postgres.";
    console.error(`[intake] ${message}`);
    result.errors.push(message);
    result.status = "error";
    await updateSource(adapter.name, {
      lastRunAt: new Date().toISOString(),
      lastStatus: "error",
      lastError: message,
      lastFetched: 0,
    });
    return result;
  }

  await updateSource(adapter.name, {
    lastRunAt: new Date().toISOString(),
    lastStatus: "ok",
    lastError: null,
  });

  let settings: {
    keywords: { lane: string; terms: string[] }[];
    categoryLaneMap: import("@/lib/intake/config/etenders-categories").CategoryLaneMapping[];
  };
  try {
    const loaded = await getSettings();
    settings = {
      keywords: loaded.keywords,
      categoryLaneMap: loaded.categoryLaneMap?.length
        ? loaded.categoryLaneMap
        : (
            await import("@/lib/intake/config/etenders-categories")
          ).DEFAULT_CATEGORY_LANE_MAP,
    };
  } catch {
    const { DEFAULT_CATEGORY_LANE_MAP } = await import(
      "@/lib/intake/config/etenders-categories"
    );
    settings = {
      keywords: [],
      categoryLaneMap: DEFAULT_CATEGORY_LANE_MAP,
    };
  }

  const defaultCats = new Set(
    (settings.categoryLaneMap.length
      ? settings.categoryLaneMap.map((m) => m.etendersCategory)
      : defaultEtendersCategories()
    ).map((c) => c.toLowerCase()),
  );
  try {
    // Prefer paged eTenders fetch with incremental upsert (survives timeouts).
    if (adapter.name === "etenders") {
      const { fetched } = await fetchOcdsReleasesPaged(
        dateFrom,
        dateTo,
        async (releases, meta) => {
          const pageItems: NormalisedOpportunity[] = [];
          for (const raw of releases) {
            try {
              const normalised = mapOcdsRelease(raw as OcdsRelease);
              result.normalised += 1;
              if (
                normalised.category &&
                defaultCats.has(normalised.category.trim().toLowerCase())
              ) {
                result.defaultCategoryHits += 1;
              }
              pageItems.push(normalised);
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Normalise failed";
              result.errors.push(message);
              console.warn(`[intake] normalise failed: ${message}`);
            }
          }

          const pageStarted = Date.now();
          await upsertReleasePage(pageItems, settings, result);
          console.info(
            `[intake] page ${meta.page} upserted=${pageItems.length} created=${result.created} amended=${result.amended} unchanged=${result.unchanged} in ${Date.now() - pageStarted}ms`,
          );

          // Persist progress after each page so a timeout keeps last-good rows.
          await updateSource(adapter.name, {
            lastFetched: result.fetched + releases.length,
            lastCreated: result.created,
            lastAmended: result.amended,
            lastStatus: "ok",
          });
          result.fetched += releases.length;
        },
      );
      result.fetched = fetched;
    } else {
      const rawItems = await adapter.fetch(dateFrom, dateTo);
      result.fetched = rawItems.length;
      for (const raw of rawItems) {
        try {
          const normalised = adapter.normalise(raw);
          result.normalised += 1;
          await upsertRelease(normalised, settings, result);
        } catch (err) {
          result.errors.push(
            err instanceof Error ? err.message : "Process failed",
          );
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    result.errors.push(message);
    result.status =
      err instanceof EtendersUnavailableError ||
      /unavailable|5xx|timeout/i.test(message)
        ? "degraded"
        : "error";
    console.error(`[intake] fetch aborted (keeping last-good DB rows): ${message}`);
    await updateSource(adapter.name, {
      lastStatus: result.status,
      lastError: message,
      lastFetched: result.fetched,
      lastCreated: result.created,
      lastAmended: result.amended,
    });
    return result;
  }

  if (result.errors.length > 0 && result.created + result.amended === 0) {
    result.status = result.fetched > 0 ? "degraded" : result.status;
  }

  console.info(
    `[intake] done fetched=${result.fetched} normalised=${result.normalised} created=${result.created} amended=${result.amended} unchanged=${result.unchanged} defaultCategoryHits=${result.defaultCategoryHits} errors=${result.errors.length}`,
  );

  await updateSource(adapter.name, {
    lastStatus: result.status,
    lastError: result.errors[0] ?? null,
    lastFetched: result.fetched,
    lastCreated: result.created,
    lastAmended: result.amended,
    lastSuccessAt:
      result.status === "error"
        ? source?.lastSuccessAt ?? null
        : new Date().toISOString(),
  });

  return result;
}

export async function runEtendersIntake(options?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const { etendersAdapter } = await import(
    "@/lib/intake/adapters/etenders/adapter"
  );
  return runIntake(etendersAdapter, options);
}
