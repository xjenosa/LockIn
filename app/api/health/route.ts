import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Replaces the old `supabaseConfigured` boolean that the landing page imported.
// That worked because the Supabase keys were NEXT_PUBLIC_*, so the browser could
// see them; DATABASE_URL is a Postgres credential and must stay server-only, so
// the check has to happen here instead.
//
// Deliberately does NOT run a query: it only reports whether the app is
// configured, exactly like the old flag. Touching the database here would wake
// Neon's compute on every landing-page view (crawlers included), working against
// the scale-to-zero that made us move in the first place.
export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.DATABASE_URL) });
}
