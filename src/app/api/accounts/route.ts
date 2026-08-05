import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { createAccount, listAccounts } from "@/lib/accounts/store";
import {
  ACCOUNT_LANES,
  ACCOUNT_STATUSES,
  type AccountLane,
  type AccountSector,
  type AccountStatus,
  type CreateAccountInput,
} from "@/lib/accounts/types";

export async function GET() {
  const auth = await requirePermission("accounts", "view");
  if (!auth.ok) return auth.response;
  const accounts = await listAccounts();
  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const auth = await requirePermission("accounts", "create");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = body as Partial<CreateAccountInput>;
  const clientName = input.clientName?.trim() ?? "";
  const projectTitle = input.projectTitle?.trim() ?? "";

  if (!clientName || !projectTitle) {
    return NextResponse.json(
      { error: "Client name and project title are required." },
      { status: 400 },
    );
  }

  if (!input.lane || !ACCOUNT_LANES.includes(input.lane as AccountLane)) {
    return NextResponse.json({ error: "A valid lane is required." }, { status: 400 });
  }

  if (input.sector !== "public" && input.sector !== "private") {
    return NextResponse.json(
      { error: "Sector must be public or private." },
      { status: 400 },
    );
  }

  if (
    input.status &&
    !ACCOUNT_STATUSES.includes(input.status as AccountStatus)
  ) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const valueZar =
    input.valueZar == null || input.valueZar === ("" as unknown)
      ? null
      : Number(input.valueZar);

  if (valueZar != null && Number.isNaN(valueZar)) {
    return NextResponse.json(
      { error: "Contract value must be a number." },
      { status: 400 },
    );
  }

  const account = await createAccount({
    clientName,
    projectTitle,
    refNo: input.refNo,
    lane: input.lane as AccountLane,
    sector: input.sector as AccountSector,
    status: input.status as AccountStatus | undefined,
    progressPercent: input.progressPercent,
    valueZar,
    startOn: input.startOn,
    endOn: input.endOn,
    notes: input.notes,
    convertedFromOpportunity: input.convertedFromOpportunity ?? true,
  });

  return NextResponse.json({ account }, { status: 201 });
}
