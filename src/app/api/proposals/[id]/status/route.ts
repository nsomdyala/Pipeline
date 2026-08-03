import { NextResponse } from "next/server";
import { updateProposalStatus } from "@/lib/proposals/store";
import {
  PROPOSAL_STATUSES,
  type ProposalStatus,
} from "@/lib/proposals/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { status?: string };
  if (!PROPOSAL_STATUSES.includes(body.status as ProposalStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const proposal = await updateProposalStatus(id, body.status as ProposalStatus);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }
  return NextResponse.json({ proposal });
}
