import { NextResponse } from "next/server";
import { getOpportunity } from "@/lib/opportunities/store";
import {
  readDocumentCache,
  writeDocumentCache,
} from "@/lib/tenders/document-cache";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string; docIndex: string }> };

function isAllowedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return (
    h === "www.etenders.gov.za" ||
    h === "etenders.gov.za" ||
    h === "ocds-api.etenders.gov.za" ||
    h.endsWith(".etenders.gov.za")
  );
}

function safeFilename(name: string) {
  return name.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180) || "document.pdf";
}

function guessMime(format: string | undefined, filename: string) {
  const f = (format ?? "").toLowerCase();
  const lower = filename.toLowerCase();
  if (f.includes("pdf") || lower.endsWith(".pdf")) return "application/pdf";
  if (f.includes("word") || lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

/**
 * Lazy document download: only hits etenders.gov.za when the user clicks Download.
 * Cached in Supabase Storage (or local /tmp fallback) for instant repeat opens.
 * Does NOT call the OCDS API to discover documents — uses links stored at intake.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, docIndex } = await params;
    const index = Number(docIndex);
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json({ error: "Invalid document." }, { status: 400 });
    }

    const opportunity = await getOpportunity(id);
    if (!opportunity) {
      return NextResponse.json({ error: "Tender not found." }, { status: 404 });
    }

    const doc = opportunity.documentLinks[index];
    if (!doc?.url) {
      return NextResponse.json(
        {
          error:
            "No downloadable document was stored for this tender at sync time. Wait for the next intake run.",
        },
        { status: 404 },
      );
    }

    let remote: URL;
    try {
      remote = new URL(doc.url);
    } catch {
      return NextResponse.json(
        { error: "Invalid document URL." },
        { status: 400 },
      );
    }

    if (!isAllowedHost(remote.hostname)) {
      return NextResponse.json(
        { error: "Document host is not allowed." },
        { status: 400 },
      );
    }

    const filename = safeFilename(doc.title || `document-${index + 1}.pdf`);
    const cached = await readDocumentCache(opportunity.id, index);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        headers: {
          "Content-Type": cached.contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(cached.buffer.length),
          "Cache-Control": "private, max-age=86400",
          "X-Pipeline-Cache": "hit",
        },
      });
    }

    const upstream = await fetch(remote.toString(), {
      headers: {
        Accept: "application/pdf,application/octet-stream,*/*",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.etenders.gov.za/",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Could not download document (${upstream.status}).` },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Document was empty." },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || guessMime(doc.format, filename);

    await writeDocumentCache(opportunity.id, index, buffer, contentType);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=86400",
        "X-Pipeline-Cache": "miss",
      },
    });
  } catch (err) {
    console.error("tender document download failed", err);
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "Document download timed out. Try again."
        : err instanceof Error
          ? err.message
          : "Could not download the document.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
