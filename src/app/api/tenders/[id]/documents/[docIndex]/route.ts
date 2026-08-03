import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { dataPath } from "@/lib/json-store";
import { getOpportunity } from "@/lib/opportunities/store";
import { enrichTenderDocuments } from "@/lib/tenders/enrich-documents";

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

function cachePaths(opportunityId: string, index: number, filename: string) {
  const dir = dataPath("tender-docs", opportunityId);
  const stored = `${index}-${safeFilename(filename)}`;
  return {
    dir,
    filePath: path.join(dir, stored),
    metaPath: path.join(dir, `${index}.meta.json`),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { id, docIndex } = await params;
  const index = Number(docIndex);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Invalid document." }, { status: 400 });
  }

  let opportunity = await getOpportunity(id);
  if (!opportunity) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }

  if (!opportunity.documentLinks[index]) {
    opportunity = await enrichTenderDocuments(opportunity);
  }

  const doc = opportunity.documentLinks[index];
  if (!doc?.url) {
    return NextResponse.json(
      {
        error:
          "No downloadable document is listed for this tender yet. Try again shortly, or open the eTenders release link from the tender page.",
      },
      { status: 404 },
    );
  }

  let remote: URL;
  try {
    remote = new URL(doc.url);
  } catch {
    return NextResponse.json({ error: "Invalid document URL." }, { status: 400 });
  }

  if (!isAllowedHost(remote.hostname)) {
    return NextResponse.json(
      { error: "Document host is not allowed." },
      { status: 400 },
    );
  }

  const filename = safeFilename(doc.title || `document-${index + 1}.pdf`);
  const { dir, filePath, metaPath } = cachePaths(id, index, filename);

  try {
    const cached = await readFile(filePath);
    let contentType = guessMime(doc.format, filename);
    try {
      const meta = JSON.parse(await readFile(metaPath, "utf8")) as {
        contentType?: string;
      };
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      // no meta
    }
    return new NextResponse(cached, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(cached.length),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    // not cached yet — fetch once and store
  }

  try {
    const upstream = await fetch(remote.toString(), {
      headers: {
        Accept: "application/pdf,application/octet-stream,*/*",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.etenders.gov.za/",
      },
      redirect: "follow",
      cache: "no-store",
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

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, buffer);
      await writeFile(
        metaPath,
        JSON.stringify({
          contentType,
          sourceUrl: doc.url,
          cachedAt: new Date().toISOString(),
        }),
        "utf8",
      );
    } catch {
      // cache is best-effort (e.g. read-only FS) — still return the file
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not download the document. Try again in a moment." },
      { status: 502 },
    );
  }
}
