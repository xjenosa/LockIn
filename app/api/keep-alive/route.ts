import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Keep-alive ping for the Supabase free tier, which PAUSES a project after 7
// days with no activity — and unpausing needs a manual click in the dashboard.
// A Vercel Cron (see vercel.json) hits this once a day; server_now() is the
// lightest real DB query there is, and any query is what resets the 7-day
// timer. Purely operational: it reads the clock and touches no game state.
//
// When CRON_SECRET is set, Vercel injects it as a Bearer token on the cron
// request and unauthenticated callers are refused. Without it the route is open,
// which is harmless (it only reads the server clock) but leaves it pingable by
// anyone. See .env.local.example.

export const dynamic = "force-dynamic"; // never cache: every hit must reach Supabase

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("server_now");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, serverNow: data });
}
