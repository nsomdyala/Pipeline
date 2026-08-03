import { NextResponse } from "next/server";
import { createEvent, listEvents } from "@/lib/calendar/store";
import { EVENT_KINDS, type EventKind } from "@/lib/calendar/types";

export async function GET() {
  return NextResponse.json({ events: await listEvents() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    kind?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    location?: string;
    agenda?: string;
    linkedTo?: string;
    attendees?: string;
  };
  if (!body.title?.trim() || !body.startsAt) {
    return NextResponse.json(
      { error: "Title and start time are required." },
      { status: 400 },
    );
  }
  if (!EVENT_KINDS.includes(body.kind as EventKind)) {
    return NextResponse.json({ error: "Invalid event kind." }, { status: 400 });
  }
  const event = await createEvent({
    kind: body.kind as EventKind,
    title: body.title,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    location: body.location,
    agenda: body.agenda,
    linkedTo: body.linkedTo,
    attendees: body.attendees,
  });
  return NextResponse.json({ event }, { status: 201 });
}
