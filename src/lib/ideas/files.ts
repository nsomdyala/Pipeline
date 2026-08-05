import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataPath } from "@/lib/json-store";
import type { IdeaAttachment, RdDocument } from "@/lib/ideas/types";

function ideaUploadDir(ideaId: string) {
  return dataPath("idea-uploads", ideaId);
}

function rdUploadDir(rdItemId: string) {
  return dataPath("rd-uploads", rdItemId);
}

export async function persistIdeaAttachments(
  ideaId: string,
  uploads: File[],
): Promise<IdeaAttachment[]> {
  if (uploads.length === 0) return [];
  const dir = ideaUploadDir(ideaId);
  await mkdir(dir, { recursive: true });

  const saved: IdeaAttachment[] = [];
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

export async function persistRdDocuments(
  rdItemId: string,
  uploads: File[],
): Promise<RdDocument[]> {
  if (uploads.length === 0) return [];
  const dir = rdUploadDir(rdItemId);
  await mkdir(dir, { recursive: true });

  const saved: RdDocument[] = [];
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

export function ideaAttachmentPath(ideaId: string, storedName: string) {
  return path.join(ideaUploadDir(ideaId), storedName);
}

export function rdDocumentPath(rdItemId: string, storedName: string) {
  return path.join(rdUploadDir(rdItemId), storedName);
}
