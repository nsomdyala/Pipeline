import { NextResponse } from "next/server";
import { runEtendersIntake } from "@/lib/intake/pipeline";
import { getSource } from "@/lib/intake/sources-store";

/**
 * Manual / cron entrypoint for the eTenders adapter.
 * Optional body: { dateFrom?: "YYYY-MM-DD", dateTo?: "YYYY-MM-DD" }
 * Optional header: x-cron-secret (if CRON_SECRET env is set).
 */
export async function GET() {
  const source = await getSource("etenders");
  return NextResponse.json({ source });
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("x-cron-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
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
    // empty body is fine
  }

  const result = await runEtendersIntake({ dateFrom, dateTo });
  return NextResponse.json({ result });
}
