import { runEtendersIntake } from "../src/lib/intake/pipeline";
import { defaultEtendersCategories } from "../src/lib/intake/config/etenders-categories";
import postgres from "postgres";

async function main() {
  console.log("DATABASE_URL", process.env.DATABASE_URL ? "set" : "MISSING");
  const result = await runEtendersIntake();
  console.log(
    "INTAKE_RESULT",
    JSON.stringify(
      {
        status: result.status,
        dateFrom: result.dateFrom,
        dateTo: result.dateTo,
        fetched: result.fetched,
        normalised: result.normalised,
        created: result.created,
        amended: result.amended,
        unchanged: result.unchanged,
        notified: result.notified,
        defaultCategoryHits: result.defaultCategoryHits,
        errors: result.errors?.slice(0, 20),
      },
      null,
      2,
    ),
  );

  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const defaults = defaultEtendersCategories().map((d) => d.toLowerCase());
  const [{ total }] = await sql`
    SELECT count(*)::int AS total FROM opportunities WHERE external_id LIKE 'ocds-%'
  `;
  const [{ open_def }] = await sql`
    SELECT count(*)::int AS open_def FROM opportunities
    WHERE external_id LIKE 'ocds-%'
      AND in_pipeline = false
      AND closing_at >= now()
      AND lower(trim(category)) = ANY(${defaults})
  `;
  const [{ all_def }] = await sql`
    SELECT count(*)::int AS all_def FROM opportunities
    WHERE external_id LIKE 'ocds-%'
      AND lower(trim(category)) = ANY(${defaults})
  `;
  const samples = await sql`
    SELECT external_id, category, left(title, 60) AS title, closing_at, in_pipeline
    FROM opportunities
    WHERE external_id LIKE 'ocds-%'
      AND lower(trim(category)) = ANY(${defaults})
    ORDER BY closing_at DESC NULLS LAST
    LIMIT 5
  `;
  console.log(
    "DB_STATS",
    JSON.stringify(
      {
        totalOcds: total,
        defaultCategoryAll: all_def,
        defaultCategoryOpenNotInPipeline: open_def,
        samples,
      },
      null,
      2,
    ),
  );
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
