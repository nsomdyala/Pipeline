import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function dataDir() {
  // Vercel serverless FS is read-only except /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "pipeline-data");
  }
  return path.join(process.cwd(), ".data");
}

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, filename);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    try {
      await writeFile(file, JSON.stringify(fallback, null, 2), "utf8");
    } catch {
      // ignore write failures
    }
    return fallback;
  }
}

export async function writeJsonFile<T>(filename: string, data: T) {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, filename),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

export function dataPath(...parts: string[]) {
  return path.join(dataDir(), ...parts);
}
