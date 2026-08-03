import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const AVATARS_BUCKET = "avatars";

export async function ensureAvatarsBucket(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data } = await supabase.storage.listBuckets();
  if (data?.some((b) => b.name === AVATARS_BUCKET)) return true;
  const { error } = await supabase.storage.createBucket(AVATARS_BUCKET, {
    public: true,
    fileSizeLimit: 3_145_728,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error && !/already exists/i.test(error.message)) {
    console.error("create avatars bucket failed", error);
    return false;
  }
  return true;
}

export function avatarObjectPath(userId: string) {
  return `${userId}/avatar.webp`;
}

export async function uploadAvatarObject(
  userId: string,
  buffer: Buffer,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Storage is not configured (missing Supabase credentials).");
  }
  const ok = await ensureAvatarsBucket();
  if (!ok) throw new Error("Could not ensure avatars storage bucket.");

  const path = avatarObjectPath(userId);
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  // Cache-bust so replaced avatars show immediately.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAvatarObject(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await ensureAvatarsBucket();
  await supabase.storage.from(AVATARS_BUCKET).remove([avatarObjectPath(userId)]);
}
