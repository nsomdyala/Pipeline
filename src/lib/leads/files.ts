import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { leadUploadDir } from "@/lib/leads/store";
import type { LeadFile, SubmissionKind } from "@/lib/leads/types";

export async function persistLeadFiles(
  leadId: string,
  kind: SubmissionKind,
  uploads: File[],
): Promise<LeadFile[]> {
  if (uploads.length === 0) return [];

  const dir = leadUploadDir(leadId);
  await mkdir(dir, { recursive: true });

  const saved: LeadFile[] = [];
  for (const file of uploads) {
    if (!file || file.size === 0) continue;
    const id = randomUUID();
    const safeName = file.name.replace(/[^\w.\- ()]/g, "_");
    const storedName = `${id}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, storedName), buffer);
    saved.push({
      id,
      filename: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      storedName,
      uploadedAt: new Date().toISOString(),
      kind,
    });
  }
  return saved;
}
