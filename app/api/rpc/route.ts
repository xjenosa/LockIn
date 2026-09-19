import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// The ONLY way a browser can invoke a database function. Every line here is a
// security boundary, so read this before editing:
//
//  * ALLOWLIST is exhaustive. A function missing from it cannot be called no
//    matter what the client posts. The internal helpers (_room_by_host,
//    _advance_control, _forget_team) and the maintenance purge
//    (delete_stale_rooms) are deliberately absent -- on Supabase those were
//    REVOKEd from the anon role, and this map is what replaces that guard.
//    Adding an entry here is the dangerous edit, not granting a table policy.
//  * Argument NAMES are interpolated into the SQL text (identifiers cannot be
//    parameterised, only values), so every key is matched against ARG_NAME.
//    Values always travel as $n placeholders.
//  * Functions are called by NAMED argument -- fn(p_x => $1) -- never
//    positionally. So argument order in lib/api.ts need not match the SQL
//    signature, and omitted arguments fall back to their SQL DEFAULTs.
//
// The response shape deliberately mimics what supabase.rpc() returned, so
// lib/api.ts only changed transport: "rows" -> array, "scalar" -> the bare
// value, "void" -> null. Failures come back as { error: "<CODE>" } carrying the
// message the SQL raised, which is what TeamJoin.FRIENDLY maps to user copy.

type Shape = "rows" | "scalar" | "void";

const ALLOWLIST: Record<string, Shape> = {
  // ---- anyone ----
  server_now: "scalar",
  create_room: "rows",
  // ---- players (authenticate by player_id; see update_player in functions.sql) ----
  join_room: "rows",
  update_player: "rows",
  claim_buzz: "rows",
  submit_final: "void",
  get_my_final: "rows",
  // ---- host (each one re-checks host_token via _room_by_host in SQL) ----
  host_start_game: "void",
  host_open_clue: "void",
  host_open_buzzer: "void",
  host_set_dd_wager: "void",
  host_reopen_after_miss: "void",
  host_award: "void",
  host_undo_event: "void",
  host_get_score_log: "rows",
  host_reveal_answer: "void",
  host_close_clue: "void",
  host_set_control: "void",
  host_set_phase: "void",
  host_lock_finals: "void",
  host_get_finals: "rows",
  host_update_team: "void",
  host_move_player: "void",
  host_remove_player: "void",
  host_reset_game: "void",
  host_delete_room: "void",
};

const ARG_NAME = /^p_[a-z0-9_]+$/;

export async function POST(request: Request) {
  let body: { fn?: unknown; args?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const fn = typeof body.fn === "string" ? body.fn : "";
  const shape = Object.prototype.hasOwnProperty.call(ALLOWLIST, fn)
    ? ALLOWLIST[fn]
    : undefined;
  if (!shape) {
    return NextResponse.json({ error: "UNKNOWN_FUNCTION" }, { status: 404 });
  }

  const args = body.args;
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  // Nulls are dropped rather than passed through. lib/api.ts sends `p_x: null`
  // to mean "not supplied", and every such parameter is DEFAULT NULL in the SQL,
  // so omitting it is equivalent -- and it additionally lets non-null defaults
  // (p_team_color, p_timer, p_arm_seconds) apply when the client omits them.
  const named: string[] = [];
  const values: unknown[] = [];
  for (const [name, value] of Object.entries(args as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (!ARG_NAME.test(name)) {
      return NextResponse.json({ error: "BAD_ARGUMENT" }, { status: 400 });
    }
    values.push(value);
    named.push(`${name} => $${values.length}`);
  }

  try {
    const rows = await query<Record<string, unknown>>(
      `select * from ${fn}(${named.join(", ")})`,
      values
    );

    if (shape === "void") return NextResponse.json({ data: null });
    if (shape === "rows") return NextResponse.json({ data: rows });
    // scalar: a single row with a single column, unwrapped the way PostgREST did.
    const first = rows[0];
    return NextResponse.json({ data: first ? Object.values(first)[0] ?? null : null });
  } catch (err) {
    // 400, not 500: the SQL raises SCREAMING_SNAKE codes for expected game-rule
    // outcomes (ROOM_NOT_FOUND, TEAM_NAME_TAKEN, GAME_CLOSED...). Forward the
    // message verbatim so the client's existing mapping keeps working.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB_ERROR" },
      { status: 400 }
    );
  }
}
