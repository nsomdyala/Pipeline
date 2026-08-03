import { NextResponse } from "next/server";
import { ensureSeedAdmin, listAuthUsers } from "@/lib/auth/users";
import { getSettings, saveCompany } from "@/lib/settings/store";
import type { CompanyProfile } from "@/lib/settings/types";

async function settingsWithDbUsers() {
  const settings = await getSettings();
  if (!process.env.DATABASE_URL) {
    return settings;
  }
  try {
    await ensureSeedAdmin();
    const rows = await listAuthUsers();
    return {
      ...settings,
      users: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as "admin" | "member" | "viewer",
        avatarUrl: u.avatarUrl ?? null,
      })),
    };
  } catch (err) {
    console.error("Could not load users from Postgres", err);
    return settings;
  }
}

export async function GET() {
  try {
    return NextResponse.json(await settingsWithDbUsers());
  } catch (err) {
    // Company settings may still be file-backed; surface a clear error on Vercel.
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load settings.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { company?: CompanyProfile };
  if (!body.company?.name?.trim()) {
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 },
    );
  }
  const settings = await saveCompany(body.company);
  if (process.env.DATABASE_URL) {
    try {
      const rows = await listAuthUsers();
      return NextResponse.json({
        ...settings,
        users: rows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as "admin" | "member" | "viewer",
          avatarUrl: u.avatarUrl ?? null,
        })),
      });
    } catch {
      // fall through
    }
  }
  return NextResponse.json(settings);
}
