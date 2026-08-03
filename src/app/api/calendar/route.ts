import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createEvent, listEvents } from "@/lib/calendar/store";
import { mergeTenderClosings } from "@/lib/calendar/tender-closings";
import { EVENT_KINDS, type EventKind } from "@/lib/calendar/types";
import { createMessage, listChannels } from "@/lib/chat/store";

export async function GET() {
  try {
    const stored = await listEvents();
    const events = await mergeTenderClosings(stored);
    return NextResponse.json({ events });
  } catch (err) {
    console.error("calendar list failed", err);
    // Still return manual events if tender sync fails
    try {
      return NextResponse.json({ events: await listEvents() });
    } catch {
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Could not load calendar.",
          events: [],
        },
        { status: 500 },
      );
    }
  }
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
    allDay?: boolean;
    notifyTeam?: boolean;
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

  const session = await getSession();
  const event = await createEvent({
    kind: body.kind as EventKind,
    title: body.title,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    location: body.location,
    agenda: body.agenda,
    linkedTo: body.linkedTo,
    attendees: body.attendees,
    createdBy: session?.name,
    allDay: body.allDay,
  });

  if (body.notifyTeam !== false) {
    try {
      const channels = await listChannels();
      const channel =
        channels.find((c) => c.name === "general") ?? channels[0];
      if (channel) {
        const when = new Intl.DateTimeFormat("en-ZA", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Johannesburg",
        }).format(new Date(event.startsAt));
        await createMessage({
          channelId: channel.id,
          authorName: "Pipeline Bot",
          body: `Calendar · ${event.kind.toUpperCase()}: ${event.title} — ${when}${event.attendees ? ` · ${event.attendees}` : ""}`,
        });
      }
    } catch {
      // chat notify is best-effort
    }
  }

  return NextResponse.json({ event }, { status: 201 });
}
