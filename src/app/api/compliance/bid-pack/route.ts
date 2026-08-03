import { NextResponse } from "next/server";
import { listVaultRows } from "@/lib/compliance/store";

export async function GET() {
  const rows = await listVaultRows();
  const lines = [
    "Pipeline — Bid pack summary",
    "Max Attention Technologies",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Document status",
    "---------------",
  ];

  let warnings = 0;
  for (const row of rows) {
    if (
      row.status === "expired" ||
      row.status === "expiring_soon" ||
      row.status === "missing"
    ) {
      warnings += 1;
    }
    lines.push(
      `- ${row.name}: ${row.status.toUpperCase()}${
        row.document ? ` · ${row.document.filename}` : " · no file"
      }${row.document?.expiresOn ? ` · expires ${row.document.expiresOn}` : ""}`,
    );
  }

  lines.push("");
  lines.push(
    warnings > 0
      ? `WARNING: ${warnings} document(s) are missing, expiring soon, or expired.`
      : "All default compliance documents are valid.",
  );

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="pipeline-bid-pack-summary.txt"',
    },
  });
}
