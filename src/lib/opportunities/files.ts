import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { opportunityUploadDir } from "@/lib/opportunities/store";
import type { OpportunityFile } from "@/lib/opportunities/types";

export async function persistUploadedFiles(
  opportunityId: string,
  uploads: File[],
): Promise<OpportunityFile[]> {
  if (uploads.length === 0) return [];

  const dir = opportunityUploadDir(opportunityId);
  await mkdir(dir, { recursive: true });

  const saved: OpportunityFile[] = [];
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
    });
  }
  return saved;
}
