// Client mirrors of the DB rows in supabase/schema.sql and of RPC return
// shapes in supabase/functions.sql. Field names ARE the DB contract: renaming
// one here without a matching schema change breaks the typed reads in
// lib/useRoom.ts silently (Supabase returns untyped JSON).
//
// dd_* fields are the internal names of the Wildcard mechanic (user-facing
// label renamed in the 2026 rebrand; DB names kept). Do not rename.

// Lifecycle order. final_* phases are user-labeled "Last Call".
export type Phase =
  | "lobby"
  | "playing"
  | "final_wager"
  | "final_clue"
  | "final_reveal"
  | "results";

export type Room = {
  id: string;
  code: string;
  pack_id: string; // must match a Pack.id in content/packs/index.ts
  phase: Phase;
  active_clue_id: string | null; // "c{catIdx}-{value}" per lib/game.ts clueId()
  buzzer_open: boolean;
  buzzed_team_id: string | null;
  buzzed_player_name: string | null;
  clue_opened_at: string | null; // timer anchor (DB clock). Null on a Wildcard = still in wager stage
  timer_seconds: number;
  locked_out_team_ids: string[]; // teams that missed this clue; barred from the steal
  revealed_clue_ids: string[]; // played squares; drives Board dimming and boardDone()
  control_team_id: string | null; // team holding the pick = pick_order[pick_index] (0-based)
  buzzer_arms_at: string | null; // buzzer goes live at this DB timestamp; claim_buzz drops earlier taps
  pick_order: string[]; // rotation ring of team ids
  pick_index: number; // 0-based index into pick_order
  active_is_dd: boolean;
  dd_team_id: string | null;
  dd_wager: number | null;
  answer_revealed: boolean;
  finals_locked: boolean;
};

export type Team = {
  id: string;
  room_id: string;
  name: string;
  color: string; // hex; picked from TEAM_COLORS but any value renders
  score: number;
  created_at: string; // join order; seeds the rotation ring
};

export type Player = {
  id: string;
  room_id: string;
  team_id: string | null;
  name: string;
};

// host_get_finals row: one per team, zero-filled when a team never submitted.
export type FinalEntry = {
  team_id: string;
  team_name: string;
  color: string;
  score: number; // pre-wager score; host reveals lowest-first
  wager: number;
  answer: string;
};

// Values are a DB CHECK constraint on score_events.reason. dd_* keys map to
// the "Wildcard" label, "final" to "Last Call" (REASON_TEXT in the host page).
export type ScoreReason =
  | "correct"
  | "miss"
  | "dd_correct"
  | "dd_wrong"
  | "final"
  | "manual";

// host_get_score_log row. label may contain the correct answer, so this data
// must never render on the projector or a phone (host screen only).
export type ScoreEvent = {
  id: string;
  team_id: string;
  team_name: string;
  color: string;
  delta: number;
  reason: ScoreReason;
  clue_id: string | null;
  label: string | null;
  reversed: boolean; // set by host_undo_event; reversed rows are excluded from the ledger
  created_at: string;
};
