import { NextResponse } from "next/server";
import { getSettings, saveCompany } from "@/lib/settings/store";
import type { CompanyProfile } from "@/lib/settings/types";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { company?: CompanyProfile };
  if (!body.company?.name?.trim()) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 },
    );
  }
  const settings = await saveCompany(body.company);
  return NextResponse.json(settings);
}
