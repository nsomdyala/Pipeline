import "server-only";

import sharp from "sharp";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function processAvatarUpload(
  file: File,
): Promise<{ buffer: Buffer; contentType: "image/webp" }> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Only JPG, PNG or WebP images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 3 MB or smaller.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const buffer = await sharp(input)
    .rotate()
    .resize(256, 256, { fit: "cover", position: "centre" })
    .webp({ quality: 82 })
    .toBuffer();

  return { buffer, contentType: "image/webp" };
}
