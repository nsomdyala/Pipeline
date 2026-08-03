import { NextResponse } from "next/server";
import { createProposal, listProposals } from "@/lib/proposals/store";
import {
  PROPOSAL_STATUSES,
  type ProposalStatus,
} from "@/lib/proposals/types";

export async function GET() {
  return NextResponse.json({ proposals: await listProposals() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    client?: string;
    opportunityRef?: string;
    summary?: string;
    valueZar?: number | null;
    status?: string;
  };
  if (!body.title?.trim() || !body.client?.trim()) {
    return NextResponse.json(
      { error: "Title and client are required." },
      { status: 400 },
    );
  }
  if (body.status && !PROPOSAL_STATUSES.includes(body.status as ProposalStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const proposal = await createProposal({
    title: body.title,
    client: body.client,
    opportunityRef: body.opportunityRef,
    summary: body.summary,
    valueZar: body.valueZar ?? null,
    status: body.status as ProposalStatus | undefined,
  });
  return NextResponse.json({ proposal }, { status: 201 });
}
