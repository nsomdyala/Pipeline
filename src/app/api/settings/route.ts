import { NextResponse } from "next/server";
import { requirePermission, requireSession } from "@/lib/auth/require-permission";
import { ensureSeedAdmin, listAuthUsers, mapManagedUser } from "@/lib/auth/users";
import { ensurePermissionsSeeded } from "@/lib/permissions/store";
import { getSettings, saveCompany } from "@/lib/settings/store";
import type { CompanyProfile } from "@/lib/settings/types";

async function settingsWithDbUsers() {
  const settings = await getSettings();
  if (!process.env.DATABASE_URL) {
    return settings;
  }
  try {
    await ensureSeedAdmin();
    await ensurePermissionsSeeded();
    const rows = await listAuthUsers();
    return {
      ...settings,
      users: rows.map(mapManagedUser),
    };
  } catch (err) {
    console.error("Could not load users from Postgres", err);
    return settings;
  }
}

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await settingsWithDbUsers());
  } catch (err) {
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
  const auth = await requirePermission("settings", "edit");
  if (!auth.ok) return auth.response;

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
        users: rows.map(mapManagedUser),
      });
    } catch {
      // fall through
    }
  }
  return NextResponse.json(settings);
}
