"use client";

import { supabase } from "./supabaseClient";

// Timebase contract: buzzer_arms_at and clue_opened_at are DB timestamps, so
// EVERY countdown must compare against serverNow(), never Date.now(). A device
// a few seconds slow holds its buzzer disabled after the race starts; a fast
// one enables it early and claim_buzz eats the tap. Consumers: Buzzer,
// ClueView, Timer. One sync round trip (from useRoom mount) is accurate enough
// for the 3-second arming window.
let skew = 0; // serverNow - Date.now(), ms
let synced = false;
let syncing = false;

export const serverNow = () => Date.now() + skew;

export async function syncServerClock() {
  if (synced || syncing) return;
  syncing = true;
  try {
    const t0 = Date.now();
    // A database missing server_now() (never migrated) leaves skew at 0, which
    // degrades to raw device time rather than failing.
    const { data, error } = await supabase.rpc("server_now");
    if (error || typeof data !== "string") return;
    // Assume a symmetric round trip: the server read its clock ~rtt/2 ago.
    skew = Date.parse(data) + (Date.now() - t0) / 2 - Date.now();
    synced = true;
  } finally {
    syncing = false;
  }
}
