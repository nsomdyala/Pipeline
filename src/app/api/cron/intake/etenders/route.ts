import { NextResponse } from "next/server";
import { runEtendersIntake } from "@/lib/intake/pipeline";

/** Scheduled worker entry — same as POST /api/intake/etenders. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const header = request.headers.get("x-cron-secret");
    const ok =
      header === secret || auth === `Bearer ${secret}`;
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const result = await runEtendersIntake();
  return NextResponse.json({ result });
}

export async function POST(request: Request) {
  return GET(request);
}
