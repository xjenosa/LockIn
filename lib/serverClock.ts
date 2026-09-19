"use client";

import { rpc } from "./api";

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
    // server_now() is declared "scalar" in the app/api/rpc allowlist, so this
    // resolves to the bare ISO timestamp string, exactly as it did through
    // PostgREST.
    const data = await rpc<string>("server_now", {});
    if (typeof data !== "string") return;
    // Assume a symmetric round trip: the server read its clock ~rtt/2 ago.
    skew = Date.parse(data) + (Date.now() - t0) / 2 - Date.now();
    synced = true;
  } catch {
    // An unreachable route, or a database never migrated (no server_now()),
    // leaves skew at 0 -- degrading to raw device time rather than failing.
  } finally {
    syncing = false;
  }
}
