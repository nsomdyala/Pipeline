import { NextResponse } from "next/server";
import {
  deleteEvent,
  getEvent,
  updateEvent,
} from "@/lib/calendar/store";
import {
  AUTO_CLOSING_PREFIX,
  isAutoClosingEvent,
  tenderClosingEvents,
} from "@/lib/calendar/tender-closings";
import { EVENT_KINDS, type EventKind } from "@/lib/calendar/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (id.startsWith(AUTO_CLOSING_PREFIX)) {
    const auto = (await tenderClosingEvents()).find((e) => e.id === id);
    if (!auto) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ event: auto });
  }
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  if (id.startsWith(AUTO_CLOSING_PREFIX)) {
    return NextResponse.json(
      {
        error:
          "Closing dates synced from All Tenders cannot be edited here. Change the tender or its category defaults instead.",
      },
      { status: 400 },
    );
  }
  const body = (await request.json()) as {
    kind?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    location?: string;
    agenda?: string;
    linkedTo?: string;
    attendees?: string;
    allDay?: boolean;
  };

  if (body.kind && !EVENT_KINDS.includes(body.kind as EventKind)) {
    return NextResponse.json({ error: "Invalid event kind." }, { status: 400 });
  }

  const event = await updateEvent(id, {
    kind: body.kind as EventKind | undefined,
    title: body.title,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    location: body.location,
    agenda: body.agenda,
    linkedTo: body.linkedTo,
    attendees: body.attendees,
    allDay: body.allDay,
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  if (id.startsWith(AUTO_CLOSING_PREFIX) || isAutoClosingEvent({ id, createdBy: "Pipeline · intake" })) {
    return NextResponse.json(
      {
        error:
          "Closing dates synced from All Tenders cannot be removed from the calendar.",
      },
      { status: 400 },
    );
  }
  const ok = await deleteEvent(id);
  if (!ok) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
