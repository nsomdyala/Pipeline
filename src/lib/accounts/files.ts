import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { accountUploadDir } from "@/lib/accounts/store";
import type { AccountDocType, AccountDocument } from "@/lib/accounts/types";

export async function persistAccountFiles(
  accountId: string,
  docType: AccountDocType,
  uploads: File[],
): Promise<AccountDocument[]> {
  if (uploads.length === 0) return [];

  const dir = path.join(accountUploadDir(accountId), docType);
  await mkdir(dir, { recursive: true });

  const saved: AccountDocument[] = [];
  for (const file of uploads) {
    if (!file || file.size === 0) continue;
    const id = randomUUID();
    const safeName = file.name.replace(/[^\w.\- ()]/g, "_");
    const storedName = `${id}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, storedName), buffer);
    saved.push({
      id,
      docType,
      filename: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      storedName: path.join(docType, storedName),
      uploadedAt: new Date().toISOString(),
    });
  }
  return saved;
}
