import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const url = process.env.DATABASE_URL;

if (!url) {
  // Avoid crashing module load in build; routes that need DB will throw clearly.
  console.warn("DATABASE_URL is not set — Postgres auth will fail until configured.");
}

const client = postgres(url ?? "postgresql://localhost:5432/pipeline_missing_url", {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
