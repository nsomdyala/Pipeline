import { NextResponse } from "next/server";
import { createPartner, listPartners } from "@/lib/partners/store";
import {
  PARTNER_KINDS,
  PARTNER_STATUSES,
  type PartnerKind,
  type PartnerStatus,
} from "@/lib/partners/types";

export async function GET() {
  return NextResponse.json({ partners: await listPartners() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const kind = String(body.kind ?? "") as PartnerKind;
    const status = (body.status
      ? String(body.status)
      : "active") as PartnerStatus;
    if (!PARTNER_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Invalid partner kind." }, { status: 400 });
    }
    if (!PARTNER_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const partner = await createPartner({
      name: String(body.name ?? ""),
      kind,
      status,
      role: String(body.role ?? ""),
      contactName: String(body.contactName ?? ""),
      contactEmail: String(body.contactEmail ?? ""),
      website: String(body.website ?? ""),
      notes: String(body.notes ?? ""),
      letterType: String(body.letterType ?? ""),
      letterExpiresAt: String(body.letterExpiresAt ?? ""),
      providesPartnerLetter: Boolean(body.providesPartnerLetter),
      sellsOurSystems: Boolean(body.sellsOurSystems),
      projectPartner: Boolean(body.projectPartner),
    });
    return NextResponse.json({ partner }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save partner." },
      { status: 400 },
    );
  }
}
