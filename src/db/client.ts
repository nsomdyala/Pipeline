import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const url = process.env.DATABASE_URL;

if (!url) {
  // Avoid crashing module load in build; routes that need DB will throw clearly.
  console.warn("DATABASE_URL is not set — Postgres auth will fail until configured.");
} else {
  try {
    const parsed = new URL(url.replace(/^postgresql:/i, "http:"));
    const port = parsed.port || "5432";
    if (port !== "6543" && /supabase/i.test(parsed.hostname)) {
      console.warn(
        "DATABASE_URL looks like a direct Supabase connection. Prefer the transaction pooler on port 6543 for serverless.",
      );
    }
  } catch {
    // ignore parse errors
  }
}

const client = postgres(url ?? "postgresql://localhost:5432/pipeline_missing_url", {
  prepare: false, // required for Supabase transaction pooler (6543)
  max: 1, // one connection per serverless isolate
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
