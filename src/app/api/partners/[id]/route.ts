import { NextResponse } from "next/server";
import { deletePartner, updatePartner } from "@/lib/partners/store";
import {
  PARTNER_KINDS,
  PARTNER_STATUSES,
  type PartnerKind,
  type PartnerStatus,
} from "@/lib/partners/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  if (body.kind && !PARTNER_KINDS.includes(String(body.kind) as PartnerKind)) {
    return NextResponse.json({ error: "Invalid partner kind." }, { status: 400 });
  }
  if (
    body.status &&
    !PARTNER_STATUSES.includes(String(body.status) as PartnerStatus)
  ) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const partner = await updatePartner(id, {
    name: body.name !== undefined ? String(body.name) : undefined,
    kind: body.kind as PartnerKind | undefined,
    status: body.status as PartnerStatus | undefined,
    role: body.role !== undefined ? String(body.role) : undefined,
    contactName:
      body.contactName !== undefined ? String(body.contactName) : undefined,
    contactEmail:
      body.contactEmail !== undefined ? String(body.contactEmail) : undefined,
    website: body.website !== undefined ? String(body.website) : undefined,
    notes: body.notes !== undefined ? String(body.notes) : undefined,
    letterType:
      body.letterType !== undefined ? String(body.letterType) : undefined,
    letterExpiresAt:
      body.letterExpiresAt !== undefined
        ? String(body.letterExpiresAt)
        : undefined,
    providesPartnerLetter:
      body.providesPartnerLetter !== undefined
        ? Boolean(body.providesPartnerLetter)
        : undefined,
    sellsOurSystems:
      body.sellsOurSystems !== undefined
        ? Boolean(body.sellsOurSystems)
        : undefined,
    projectPartner:
      body.projectPartner !== undefined
        ? Boolean(body.projectPartner)
        : undefined,
  });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }
  return NextResponse.json({ partner });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const ok = await deletePartner(id);
  if (!ok) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
