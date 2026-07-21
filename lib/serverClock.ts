"use client";

import { supabase } from "./supabaseClient";

// buzzer_arms_at and clue_opened_at are Postgres timestamps, so every countdown
// has to be measured against the DB clock. A phone a few seconds slow would
// otherwise hold its buzzer disabled after the race has started; a fast one
// would enable it before claim_buzz will accept the tap. One round trip on
// mount is enough for a 3-second arming window.
let skew = 0; // serverNow - Date.now()
let synced = false;
let syncing = false;

export const serverNow = () => Date.now() + skew;

export async function syncServerClock() {
  if (synced || syncing) return;
  syncing = true;
  try {
    const t0 = Date.now();
    // Pre-migration databases have no server_now(); skew stays 0 and every
    // countdown behaves exactly as it did before.
    const { data, error } = await supabase.rpc("server_now");
    if (error || typeof data !== "string") return;
    // Assume a symmetric round trip: the server read its clock ~rtt/2 ago.
    skew = Date.parse(data) + (Date.now() - t0) / 2 - Date.now();
    synced = true;
  } finally {
    syncing = false;
  }
}
