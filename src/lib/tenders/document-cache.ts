import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataPath } from "@/lib/json-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "tender-docs";

export type CachedDocument = {
  buffer: Buffer;
  contentType: string;
};

function storageObjectPath(opportunityId: string, index: number) {
  return `${opportunityId}/${index}`;
}

function localPaths(opportunityId: string, index: number) {
  const dir = dataPath("tender-docs", opportunityId);
  return {
    dir,
    filePath: path.join(dir, `${index}.bin`),
    metaPath: path.join(dir, `${index}.meta.json`),
  };
}

async function ensureBucket() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data } = await supabase.storage.listBuckets();
  if (data?.some((b) => b.name === BUCKET)) return true;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 52_428_800,
  });
  if (error && !/already exists/i.test(error.message)) {
    console.error("create tender-docs bucket failed", error);
    return false;
  }
  return true;
}

export async function readDocumentCache(
  opportunityId: string,
  index: number,
): Promise<CachedDocument | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const objectPath = storageObjectPath(opportunityId, index);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(objectPath);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        const contentType =
          data.type || "application/octet-stream";
        return { buffer, contentType };
      }
    } catch (err) {
      console.error("supabase document cache read failed", err);
    }
  }

  try {
    const { filePath, metaPath } = localPaths(opportunityId, index);
    const buffer = await readFile(filePath);
    let contentType = "application/octet-stream";
    try {
      const meta = JSON.parse(await readFile(metaPath, "utf8")) as {
        contentType?: string;
      };
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      // ignore
    }
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function writeDocumentCache(
  opportunityId: string,
  index: number,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await ensureBucket();
      const objectPath = storageObjectPath(opportunityId, index);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, buffer, {
          contentType,
          upsert: true,
        });
      if (error) console.error("supabase document cache write failed", error);
      else return;
    } catch (err) {
      console.error("supabase document cache write failed", err);
    }
  }

  try {
    const { dir, filePath, metaPath } = localPaths(opportunityId, index);
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, buffer);
    await writeFile(
      metaPath,
      JSON.stringify({ contentType, cachedAt: new Date().toISOString() }),
      "utf8",
    );
  } catch {
    // best-effort local fallback
  }
}
