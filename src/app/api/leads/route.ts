import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createLead, listLeads } from "@/lib/leads/store";
import {
  LEAD_LANES,
  LEAD_SOURCES,
  type CreateLeadInput,
  type LeadLane,
  type LeadSector,
  type LeadSource,
} from "@/lib/leads/types";

export async function GET() {
  const auth = await requirePermission("leads", "view");
  if (!auth.ok) return auth.response;
  const leads = await listLeads();
  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const auth = await requirePermission("leads", "create");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = body as Partial<CreateLeadInput>;
  const title = input.title?.trim() ?? "";
  const company = input.company?.trim() ?? "";

  if (!title || !company) {
    return NextResponse.json(
      { error: "Title and company are required." },
      { status: 400 },
    );
  }

  if (!input.lane || !LEAD_LANES.includes(input.lane as LeadLane)) {
    return NextResponse.json({ error: "A valid lane is required." }, { status: 400 });
  }

  if (input.sector !== "public" && input.sector !== "private") {
    return NextResponse.json(
      { error: "Sector must be public or private." },
      { status: 400 },
    );
  }

  if (!input.source || !LEAD_SOURCES.includes(input.source as LeadSource)) {
    return NextResponse.json(
      { error: "A valid source is required." },
      { status: 400 },
    );
  }

  const lead = await createLead({
    title,
    company,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    lane: input.lane as LeadLane,
    sector: input.sector as LeadSector,
    source: input.source as LeadSource,
    notes: input.notes,
  });

  return NextResponse.json({ lead }, { status: 201 });
}
