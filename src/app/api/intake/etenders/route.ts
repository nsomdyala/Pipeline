import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { runEtendersIntake } from "@/lib/intake/pipeline";
import { getSource } from "@/lib/intake/sources-store";

export const runtime = "nodejs";
/** Allow a full multi-page pull on Vercel Pro; Hobby still benefits from incremental upserts. */
export const maxDuration = 300;

function authorized(request: Request, session: Awaited<ReturnType<typeof getSession>>) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-cron-secret");
    const auth = request.headers.get("authorization");
    if (header === secret || auth === `Bearer ${secret}`) return true;
  }
  // Manual "Run intake now" from the app — admins only.
  if (session?.role === "admin") return true;
  // If no CRON_SECRET is configured, allow any signed-in user (local/dev).
  if (!secret && session) return true;
  return false;
}

/**
 * Manual / cron entrypoint for the eTenders adapter.
 * Optional body: { dateFrom?: "YYYY-MM-DD", dateTo?: "YYYY-MM-DD" }
 * Auth: CRON_SECRET header OR admin session.
 */
export async function GET() {
  const source = await getSource("etenders");
  return NextResponse.json({
    source,
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL?.trim()),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!authorized(request, session)) {
    return NextResponse.json(
      { error: "Unauthorized. Sign in as admin or provide x-cron-secret." },
      { status: 401 },
    );
  }

  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  try {
    const body = (await request.json()) as {
      dateFrom?: string;
      dateTo?: string;
    };
    dateFrom = body.dateFrom;
    dateTo = body.dateTo;
  } catch {
    // empty body is fine — pipeline defaults to last 60 days
  }

  console.info(
    `[api/intake/etenders] POST by ${session?.email ?? "cron"} dateFrom=${dateFrom ?? "(default 60d)"} dateTo=${dateTo ?? "(today)"}`,
  );

  try {
    const result = await runEtendersIntake({ dateFrom, dateTo });
    return NextResponse.json({
      result,
      summary: `Fetched ${result.fetched}, created ${result.created}, updated ${result.amended}, unchanged ${result.unchanged}.`,
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Intake failed.";
    console.error(`[api/intake/etenders] fatal: ${message}`);
    return NextResponse.json(
      {
        error: message,
        databaseUrlConfigured: Boolean(process.env.DATABASE_URL?.trim()),
      },
      { status: 500 },
    );
  }
}
