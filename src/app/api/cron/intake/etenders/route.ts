import { NextResponse } from "next/server";
import { runEtendersIntake } from "@/lib/intake/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Daily Vercel cron — same pipeline as POST /api/intake/etenders. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const header = request.headers.get("x-cron-secret");
    const ok = header === secret || auth === `Bearer ${secret}`;
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  console.info(
    `[cron/intake/etenders] start DATABASE_URL=${process.env.DATABASE_URL ? "set" : "MISSING"}`,
  );

  try {
    const result = await runEtendersIntake();
    console.info(
      `[cron/intake/etenders] done fetched=${result.fetched} created=${result.created} amended=${result.amended}`,
    );
    return NextResponse.json({
      result,
      summary: `Fetched ${result.fetched}, created ${result.created}, updated ${result.amended}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron intake failed.";
    console.error(`[cron/intake/etenders] fatal: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
