import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { seedAccounts } from "@/lib/accounts/seed";
import type {
  Account,
  AccountDocument,
  CreateAccountInput,
} from "@/lib/accounts/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "accounts.json");
export const ACCOUNT_UPLOADS_DIR = path.join(DATA_DIR, "account-uploads");

async function ensureStore(): Promise<Account[]> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Account[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure The Innovation Hub is always present even on older files.
      if (!parsed.some((a) => a.id === "acct-innovationhub")) {
        const [hub] = seedAccounts();
        parsed.unshift(hub);
        await writeFile(DATA_FILE, JSON.stringify(parsed, null, 2), "utf8");
      }
      return parsed;
    }
  } catch {
    // first run
  }
  const seeded = seedAccounts();
  await writeFile(DATA_FILE, JSON.stringify(seeded, null, 2), "utf8");
  return seeded;
}

async function save(items: Account[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function listAccounts(): Promise<Account[]> {
  const items = await ensureStore();
  return items.sort((a, b) => {
    // Keep The Innovation Hub first — primary demo account.
    if (a.id === "acct-innovationhub") return -1;
    if (b.id === "acct-innovationhub") return 1;
    return a.clientName.localeCompare(b.clientName);
  });
}

export async function getAccount(id: string): Promise<Account | null> {
  const items = await ensureStore();
  return items.find((item) => item.id === id) ?? null;
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<Account> {
  const now = new Date().toISOString();
  const account: Account = {
    id: randomUUID(),
    clientName: input.clientName.trim(),
    projectTitle: input.projectTitle.trim(),
    refNo: input.refNo?.trim() ?? "",
    lane: input.lane,
    sector: input.sector,
    status: input.status ?? "active",
    progressPercent: Math.min(
      100,
      Math.max(0, input.progressPercent ?? 0),
    ),
    valueZar:
      input.valueZar == null || Number.isNaN(input.valueZar)
        ? null
        : input.valueZar,
    startOn: input.startOn?.trim() ?? "",
    endOn: input.endOn?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    ownerName: "Ndumiso Somdyala",
    convertedFromOpportunity: Boolean(input.convertedFromOpportunity ?? true),
    documents: [],
    createdAt: now,
    updatedAt: now,
  };

  const items = await ensureStore();
  items.unshift(account);
  await save(items);
  return account;
}

export async function addDocumentsToAccount(
  id: string,
  documents: AccountDocument[],
): Promise<Account | null> {
  const items = await ensureStore();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  items[index] = {
    ...items[index],
    documents: [...items[index].documents, ...documents],
    updatedAt: new Date().toISOString(),
  };
  await save(items);
  return items[index];
}

export function accountUploadDir(accountId: string) {
  return path.join(ACCOUNT_UPLOADS_DIR, accountId);
}
