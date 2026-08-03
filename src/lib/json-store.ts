import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  await mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, filename);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    await writeFile(file, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

export async function writeJsonFile<T>(filename: string, data: T) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

export function dataPath(...parts: string[]) {
  return path.join(DATA_DIR, ...parts);
}
