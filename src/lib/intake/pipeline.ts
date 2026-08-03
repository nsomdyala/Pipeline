import { matchLanes } from "@/lib/intake/match/lanes";
import { matchPanel } from "@/lib/intake/match/panels";
import { getSource, updateSource } from "@/lib/intake/sources-store";
import type {
  IntakeRunResult,
  NormalisedOpportunity,
  SourceAdapter,
} from "@/lib/intake/types";
import { EtendersUnavailableError } from "@/lib/intake/adapters/etenders/client";
import { createMessage, listChannels } from "@/lib/chat/store";
import {
  createOpportunityFromIntake,
  findByExternalId,
  updateOpportunityFromIntake,
} from "@/lib/opportunities/store";
import type { Opportunity } from "@/lib/opportunities/types";
import { getSettings } from "@/lib/settings/store";

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
  if (kind === "amended") return; // chatter only on new matched cards for now
  if (!shouldNotify(opp)) return;

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
}

function applyMatch(
  normalised: NormalisedOpportunity,
  keywordConfig: { lane: string; terms: string[] }[],
) {
  const lane = matchLanes(normalised.matchText, keywordConfig);
  const panel = matchPanel(normalised);
  return { lane, panel };
}

/**
 * Shared intake pipeline: fetch → normalise → dedupe → match → upsert → notify.
 * Source-specific logic stays inside the adapter.
 */
export async function runIntake(
  adapter: SourceAdapter,
  options?: { dateFrom?: string; dateTo?: string },
): Promise<IntakeRunResult> {
  const source = await getSource(adapter.name);
  const dateTo = options?.dateTo ?? johannesburgDate();
  const dateFrom =
    options?.dateFrom ??
    (source?.lastSuccessAt
      ? johannesburgDate(new Date(source.lastSuccessAt))
      : daysAgoIsoDate(7));

  const result: IntakeRunResult = {
    sourceKey: adapter.name,
    fetched: 0,
    normalised: 0,
    created: 0,
    amended: 0,
    unchanged: 0,
    notified: 0,
    errors: [],
    status: "ok",
    dateFrom,
    dateTo,
  };

  await updateSource(adapter.name, {
    lastRunAt: new Date().toISOString(),
    lastStatus: "ok",
    lastError: null,
  });

  let rawItems: unknown[] = [];
  try {
    rawItems = await adapter.fetch(dateFrom, dateTo);
    result.fetched = rawItems.length;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    result.errors.push(message);
    result.status =
      err instanceof EtendersUnavailableError || /unavailable|5xx/i.test(message)
        ? "degraded"
        : "error";
    await updateSource(adapter.name, {
      lastStatus: result.status,
      lastError: message,
      lastFetched: 0,
    });
    return result;
  }

  const settings = await getSettings();

  for (const raw of rawItems) {
    let normalised: NormalisedOpportunity;
    try {
      normalised = adapter.normalise(raw);
      result.normalised += 1;
    } catch (err) {
      result.errors.push(
        err instanceof Error ? err.message : "Normalise failed",
      );
      continue;
    }

    try {
      const { lane, panel } = applyMatch(normalised, settings.keywords);
      const existing = await findByExternalId(normalised.externalId);

      if (!existing) {
        const created = await createOpportunityFromIntake({
          normalised,
          lane: lane.lane,
          relevanceScore: lane.relevanceScore,
          lowRelevance: lane.lowRelevance,
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
        continue;
      }

      if (existing.contentHash === normalised.contentHash) {
        result.unchanged += 1;
        continue;
      }

      const amended = await updateOpportunityFromIntake(existing.id, {
        normalised,
        lane: lane.lane,
        relevanceScore: lane.relevanceScore,
        lowRelevance: lane.lowRelevance,
        opportunityType: panel.opportunityType,
        isPanel: panel.isPanel,
        panelMaxParticipants: panel.panelMaxParticipants,
        panelTerm: panel.panelTerm,
      });
      if (amended) {
        result.amended += 1;
        await notifyOpportunity(amended, "amended");
      }
    } catch (err) {
      result.errors.push(
        err instanceof Error ? err.message : "Upsert failed",
      );
    }
  }

  if (result.errors.length > 0 && result.created + result.amended === 0) {
    result.status = result.fetched > 0 ? "degraded" : result.status;
  }

  await updateSource(adapter.name, {
    lastStatus: result.status,
    lastError: result.errors[0] ?? null,
    lastFetched: result.fetched,
    lastCreated: result.created,
    lastAmended: result.amended,
    lastSuccessAt:
      result.status === "error" ? source?.lastSuccessAt ?? null : new Date().toISOString(),
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
