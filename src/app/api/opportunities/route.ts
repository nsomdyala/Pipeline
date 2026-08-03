import { NextResponse } from "next/server";
import { persistUploadedFiles } from "@/lib/opportunities/files";
import {
  addFilesToOpportunity,
  createOpportunity,
  listOpportunities,
} from "@/lib/opportunities/store";
import {
  OPP_LANES,
  OPP_SOURCES,
  OPP_STAGES,
  type CreateOpportunityInput,
  type OppLane,
  type OppSector,
  type OppSource,
  type OppStage,
} from "@/lib/opportunities/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope =
    searchParams.get("scope") === "all" ? "all" : ("pipeline" as const);
  const opportunities = await listOpportunities({ scope });
  return NextResponse.json({ opportunities });
}

function parseForm(form: FormData): CreateOpportunityInput | { error: string } {
  const refNo = String(form.get("refNo") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const buyer = String(form.get("buyer") ?? "").trim();
  const closingAtRaw = String(form.get("closingAt") ?? "").trim();
  const lane = String(form.get("lane") ?? "") as OppLane;
  const source = String(form.get("source") ?? "") as OppSource;
  const sector = String(form.get("sector") ?? "") as OppSector;
  const stageRaw = String(form.get("stage") ?? "Spotted") as OppStage;
  const valueRaw = String(form.get("estimatedValueZar") ?? "").trim();

  if (!refNo || !title || !buyer || !closingAtRaw) {
    return { error: "Reference, title, buyer and closing date are required." };
  }
  if (!OPP_LANES.includes(lane)) return { error: "A valid lane is required." };
  if (!OPP_SOURCES.includes(source)) {
    return { error: "A valid source is required." };
  }
  if (sector !== "public" && sector !== "private") {
    return { error: "Sector must be public or private." };
  }
  if (!OPP_STAGES.includes(stageRaw)) {
    return { error: "A valid stage is required." };
  }

  const closingAt = new Date(closingAtRaw);
  if (Number.isNaN(closingAt.getTime())) {
    return { error: "Closing date is invalid." };
  }

  const estimatedValueZar = valueRaw === "" ? null : Number(valueRaw);
  if (estimatedValueZar != null && Number.isNaN(estimatedValueZar)) {
    return { error: "Estimated value must be a number." };
  }

  const briefingAtRaw = String(form.get("briefingAt") ?? "").trim();
  const briefingAt =
    briefingAtRaw === "" || Number.isNaN(new Date(briefingAtRaw).getTime())
      ? ""
      : new Date(briefingAtRaw).toISOString();

  return {
    refNo,
    title,
    description: String(form.get("description") ?? ""),
    buyer,
    sector,
    source,
    lane,
    stage: stageRaw,
    closingAt: closingAt.toISOString(),
    briefingAt,
    briefingCompulsory: form.get("briefingCompulsory") === "true",
    briefingVenue: String(form.get("briefingVenue") ?? ""),
    estimatedValueZar,
    sourceUrl: String(form.get("sourceUrl") ?? ""),
  };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = parseForm(form);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let opportunity = await createOpportunity(parsed);

  const uploads = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (uploads.length > 0) {
    const files = await persistUploadedFiles(opportunity.id, uploads);
    opportunity =
      (await addFilesToOpportunity(opportunity.id, files)) ?? opportunity;
  }

  return NextResponse.json({ opportunity }, { status: 201 });
}
