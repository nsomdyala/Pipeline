import "server-only";

import { db } from "@/db/client";
import { auditLog } from "@/db/schema";

/**
 * FLAG: audit_log.actor_id references profiles.id, not users.id.
 * We write actorId as null and put the acting portal user in `diff`
 * so we do not invent a parallel audit system or break the FK.
 */
export async function writeAudit(input: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  diff?: Record<string, unknown> | null;
}) {
  try {
    await db.insert(auditLog).values({
      actorId: null,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      action: input.action,
      diff: {
        ...(input.diff ?? {}),
        actorUserId: input.actorUserId ?? null,
        actorEmail: input.actorEmail ?? null,
        actorName: input.actorName ?? null,
      },
    });
  } catch (err) {
    // Never fail the primary mutation because audit write failed.
    console.error("audit write failed", err);
  }
}
