// Headless test harness: the closest thing this repo has to a test suite.
// Drives the production RPCs (supabase/functions.sql) exactly as the app
// does, but at inhuman intensity: 20 buzzes in the same millisecond, taps
// before the buzzer arms, concurrent undo storms. Run it after ANY change to
// functions.sql or schema.sql.
//
//   node scripts/simulate.mjs            # all suites
//   node scripts/simulate.mjs buzz undo  # named suites only (keys in suite() calls)
//
// Requires .env.local. Creates real throwaway rooms in the live Supabase
// project; they are ordinary rooms, so cleanup.sql's stale purge removes them.
// Exit code 0 = all checks passed.

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const PACK = "picnic-general";

async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}
const room = (code) => sb.from("rooms").select("*").eq("code", code).maybeSingle().then((r) => r.data);
const teamsOf = (roomId) =>
  sb.from("teams").select("*").eq("room_id", roomId).order("created_at").then((r) => r.data ?? []);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- harness ---
const results = [];
let currentSuite = "";
function check(name, pass, detail = "") {
  results.push({ suite: currentSuite, name, pass, detail });
  process.stdout.write(pass ? "." : "F");
}
const eq = (name, actual, expected, extra = "") =>
  check(name, actual === expected, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}${extra ? "; " + extra : ""}`);

async function suite(key, only, name, fn) {
  if (only.length && !only.includes(key)) return;
  currentSuite = name;
  process.stdout.write(`\n${name.padEnd(34)} `);
  try {
    await fn();
  } catch (e) {
    check("suite crashed", false, e.message);
  }
}

// ------------------------------------------------------------ fixture ------
// A room mid-game with `n` teams of 1 player each, ready to open clues.
async function freshGame(n = 3) {
  const [{ code, host_token }] = await rpc("create_room", { p_pack_id: PACK });
  const players = [];
  for (let i = 0; i < n; i++) {
    const [p] = await rpc("join_room", {
      p_code: code,
      p_player_name: `P${i}`,
      p_team_name: `Team ${i}`,
      p_team_color: "#FFD166",
      p_existing_team_id: null,
    });
    players.push(p);
  }
  await rpc("host_start_game", { p_host_token: host_token });
  const r = await room(code);
  return { code, token: host_token, players, roomId: r.id };
}

// Sum of every non-reversed score_event per team: must always equal teams.score.
async function ledgerMatches(token, roomId) {
  const log = await rpc("host_get_score_log", { p_host_token: token });
  const expected = new Map();
  for (const e of log) {
    if (e.reversed) continue;
    expected.set(e.team_id, (expected.get(e.team_id) ?? 0) + e.delta);
  }
  const teams = await teamsOf(roomId);
  const bad = teams.filter((t) => t.score !== (expected.get(t.id) ?? 0));
  return { ok: bad.length === 0, bad: bad.map((t) => `${t.name}: score=${t.score} ledger=${expected.get(t.id) ?? 0}`) };
}

// =========================================================== suites =========
const only = process.argv.slice(2);

// --- 1. Buzz concurrency: the thing you cannot test with friends -----------
await suite("buzz", only, "buzz concurrency", async () => {
  const g = await freshGame(4);
  const CLUE = "c0-200";
  await rpc("host_open_clue", { p_host_token: g.token, p_clue_id: CLUE, p_is_dd: false, p_timer: 12 });
  await rpc("host_open_buzzer", { p_host_token: g.token, p_arm_seconds: 0 });

  // 20 buzzes fired as simultaneously as the event loop allows.
  const storm = Array.from({ length: 20 }, (_, i) =>
    rpc("claim_buzz", { p_code: g.code, p_player_id: g.players[i % g.players.length].player_id, p_clue_id: CLUE })
  );
  const settled = await Promise.allSettled(storm);
  const wins = settled.filter((s) => s.status === "fulfilled" && s.value?.[0]?.won).length;
  eq("exactly one winner out of 20 concurrent buzzes", wins, 1);

  const r = await room(g.code);
  check("room records a buzzed team", !!r.buzzed_team_id, "buzzed_team_id is null");
  check("room records the buzzing player", !!r.buzzed_player_name, "buzzed_player_name is null");

  // Winner must match a real team, and buzzes log must contain the winner.
  const { data: buzzes } = await sb.from("buzzes").select("*").eq("room_id", g.roomId).eq("clue_id", CLUE);
  eq("exactly one row in the buzzes audit log", buzzes?.length, 1);
  eq("audit log winner matches room state", buzzes?.[0]?.team_id, r.buzzed_team_id);

  // A second storm while already buzzed must change nothing.
  await Promise.allSettled(
    g.players.map((p) => rpc("claim_buzz", { p_code: g.code, p_player_id: p.player_id, p_clue_id: CLUE }))
  );
  const r2 = await room(g.code);
  eq("a locked buzzer cannot be stolen", r2.buzzed_team_id, r.buzzed_team_id);
});

// --- 2. The 3-second arm delay --------------------------------------------
await suite("arm", only, "buzzer arm delay", async () => {
  const g = await freshGame(3);
  const CLUE = "c0-400";
  await rpc("host_open_clue", { p_host_token: g.token, p_clue_id: CLUE, p_is_dd: false, p_timer: 12 });
  await rpc("host_open_buzzer", { p_host_token: g.token, p_arm_seconds: 3 });

  const r = await room(g.code);
  check("buzzer_arms_at is set in the future", new Date(r.buzzer_arms_at) > new Date(), `arms_at=${r.buzzer_arms_at}`);
  check("clue_opened_at matches arms_at (clock starts after countdown)",
    r.clue_opened_at === r.buzzer_arms_at, `opened=${r.clue_opened_at} arms=${r.buzzer_arms_at}`);

  // Spam during the countdown: every one must be rejected.
  const early = await Promise.all(
    Array.from({ length: 12 }, () =>
      rpc("claim_buzz", { p_code: g.code, p_player_id: g.players[0].player_id, p_clue_id: CLUE })
    )
  );
  eq("12 taps during the countdown all rejected", early.filter((e) => e[0]?.won).length, 0);
  const mid = await room(g.code);
  eq("spamming does not latch a winner", mid.buzzed_team_id, null);

  // Wait past the arm moment, then buzz for real.
  const waitMs = new Date(r.buzzer_arms_at).getTime() - Date.now() + 400;
  await sleep(Math.max(waitMs, 0));
  const late = await rpc("claim_buzz", { p_code: g.code, p_player_id: g.players[1].player_id, p_clue_id: CLUE });
  check("a buzz after arming is accepted", late[0]?.won === true, "still rejected after arms_at passed");

  // Spamming early must not have given player 0 any advantage.
  const after = await room(g.code);
  eq("the winner is whoever buzzed after arming, not the spammer", after.buzzed_team_id, late[0]?.team_id);
});

// --- 3. Rotation: the anti-sweep guarantee ---------------------------------
await suite("rotation", only, "turn rotation", async () => {
  const g = await freshGame(3);
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const before = await room(g.code);
    seen.push(before.control_team_id);
    const clue = `c${i % 6}-200`;
    await rpc("host_open_clue", { p_host_token: g.token, p_clue_id: clue, p_is_dd: false, p_timer: 12 });
    await rpc("host_open_buzzer", { p_host_token: g.token, p_arm_seconds: 0 });
    // Same team answers correctly every single time: the sweep scenario.
    await rpc("claim_buzz", { p_code: g.code, p_player_id: g.players[0].player_id, p_clue_id: clue });
    await rpc("host_award", {
      p_host_token: g.token, p_team_id: g.players[0].team_id, p_delta: 200,
      p_reason: "correct", p_clue_id: clue, p_label: "sim",
    });
    await rpc("host_close_clue", { p_host_token: g.token });
  }
  const after = await room(g.code);
  seen.push(after.control_team_id);

  const distinct = new Set(seen.filter(Boolean)).size;
  check("control rotates even when one team wins every clue", distinct >= 3,
    `only ${distinct} distinct controllers across 7 samples: ${seen.join(",")}`);
  check("control never repeats back-to-back",
    seen.every((v, i) => i === 0 || v !== seen[i - 1]),
    `sequence: ${seen.join(",")}`);
  eq("pick_index stays in range", after.pick_index < (after.pick_order?.length || 1), true);

  // A duplicate close must not skip a team.
  const c1 = (await room(g.code)).control_team_id;
  await rpc("host_close_clue", { p_host_token: g.token });
  eq("a duplicate close does not advance the turn", (await room(g.code)).control_team_id, c1);

  // Mid-game joiner lands in the ring.
  await rpc("join_room", {
    p_code: g.code, p_player_name: "Latecomer", p_team_name: "Team late",
    p_team_color: "#FFD166", p_existing_team_id: null,
  });
  await rpc("host_open_clue", { p_host_token: g.token, p_clue_id: "c5-1000", p_is_dd: false, p_timer: 12 });
  await rpc("host_close_clue", { p_host_token: g.token });
  const withLate = await room(g.code);
  eq("mid-game joiner is appended to the rotation ring", withLate.pick_order.length, 4);
});

// --- 4 & 5. Score ledger + undo integrity ---------------------------------
await suite("undo", only, "score ledger and undo", async () => {
  const g = await freshGame(3);
  const team = g.players[0].team_id;
  const CLUE = "c1-600";

  await rpc("host_award", { p_host_token: g.token, p_team_id: team, p_delta: 600, p_reason: "correct", p_clue_id: CLUE, p_label: "a" });
  await rpc("host_award", { p_host_token: g.token, p_team_id: team, p_delta: 400, p_reason: "correct", p_clue_id: CLUE, p_label: "b" });
  await rpc("host_award", { p_host_token: g.token, p_team_id: team, p_delta: -200, p_reason: "miss", p_clue_id: CLUE, p_label: "c" });

  let l = await ledgerMatches(g.token, g.roomId);
  check("score equals the event ledger after 3 awards", l.ok, l.bad.join("; "));

  const log = await rpc("host_get_score_log", { p_host_token: g.token });
  const first = log.find((e) => e.label === "a");
  const scoreBefore = (await teamsOf(g.roomId)).find((t) => t.id === team).score;

  // Undo the middle of the stack, not the top: the host's real recovery path.
  await rpc("host_undo_event", { p_host_token: g.token, p_event_id: first.id });
  const scoreAfter = (await teamsOf(g.roomId)).find((t) => t.id === team).score;
  eq("undoing a non-top event applies exactly -delta", scoreAfter, scoreBefore - 600);

  l = await ledgerMatches(g.token, g.roomId);
  check("ledger still matches after undo", l.ok, l.bad.join("; "));

  // Double-undo of the same event (double tap / request retry) must not
  // double-refund; host_undo_event's reversed flag is the guard.
  await rpc("host_undo_event", { p_host_token: g.token, p_event_id: first.id });
  await rpc("host_undo_event", { p_host_token: g.token, p_event_id: first.id });
  eq("double-undo does not double-refund",
    (await teamsOf(g.roomId)).find((t) => t.id === team).score, scoreAfter);

  // 40 undos of every event, hammered: ledger must survive.
  const all = await rpc("host_get_score_log", { p_host_token: g.token });
  await Promise.allSettled(
    all.flatMap((e) => [
      rpc("host_undo_event", { p_host_token: g.token, p_event_id: e.id }),
      rpc("host_undo_event", { p_host_token: g.token, p_event_id: e.id }),
    ])
  );
  l = await ledgerMatches(g.token, g.roomId);
  check("ledger survives concurrent undo storm", l.ok, l.bad.join("; "));
  eq("all events reversed leaves score at zero",
    (await teamsOf(g.roomId)).find((t) => t.id === team).score, 0);
});

// --- 6. Lockout enforcement ------------------------------------------------
await suite("lockout", only, "steal lockout", async () => {
  const g = await freshGame(3);
  const CLUE = "c2-800";
  await rpc("host_open_clue", { p_host_token: g.token, p_clue_id: CLUE, p_is_dd: false, p_timer: 12 });
  await rpc("host_open_buzzer", { p_host_token: g.token, p_arm_seconds: 0 });
  await rpc("claim_buzz", { p_code: g.code, p_player_id: g.players[0].player_id, p_clue_id: CLUE });
  await rpc("host_reopen_after_miss", { p_host_token: g.token, p_penalty: 800, p_arm_seconds: 0 });

  const r = await room(g.code);
  check("missed team is locked out", r.locked_out_team_ids.includes(g.players[0].team_id), "not in locked_out_team_ids");
  eq("steal round clears answer_revealed (no answer on the projector)", r.answer_revealed, false);

  const retry = await rpc("claim_buzz", { p_code: g.code, p_player_id: g.players[0].player_id, p_clue_id: CLUE });
  eq("a locked-out team cannot win the steal", retry[0]?.won, false);

  const steal = await rpc("claim_buzz", { p_code: g.code, p_player_id: g.players[1].player_id, p_clue_id: CLUE });
  eq("another team can steal", steal[0]?.won, true);

  // Undoing the miss should lift the lockout for the live clue.
  const log = await rpc("host_get_score_log", { p_host_token: g.token });
  const missEv = log.find((e) => e.reason === "miss");
  if (missEv) {
    await rpc("host_undo_event", { p_host_token: g.token, p_event_id: missEv.id });
    const r2 = await room(g.code);
    eq("undoing the miss lifts the lockout", r2.locked_out_team_ids.includes(g.players[0].team_id), false);
  } else {
    check("host_reopen_after_miss logs an undoable miss event", false, "no reason='miss' row in score log");
  }
});

// --- 7. Host token isolation ----------------------------------------------
await suite("auth", only, "cross-room auth", async () => {
  const a = await freshGame(2);
  const b = await freshGame(2);

  let blocked = false;
  try {
    await rpc("host_award", {
      p_host_token: a.token, p_team_id: b.players[0].team_id, p_delta: 9000,
      p_reason: "manual", p_clue_id: null, p_label: "cross-room",
    });
  } catch { blocked = true; }
  const bScore = (await teamsOf(b.roomId)).find((t) => t.id === b.players[0].team_id).score;
  check("room A's host cannot award points in room B", blocked || bScore === 0, `B team score = ${bScore}`);

  let badToken = false;
  try {
    await rpc("host_start_game", { p_host_token: "00000000-0000-0000-0000-000000000000" });
  } catch { badToken = true; }
  check("an invalid host token is rejected", badToken, "bogus token was accepted");

  const { data: hosts } = await sb.from("room_hosts").select("*").limit(1);
  check("room_hosts is not readable with the anon key", !hosts || hosts.length === 0, "host tokens are exposed!");
});

// --- 8. update_player guards ----------------------------------------------
await suite("identity", only, "player identity edits", async () => {
  const g = await freshGame(3);

  // Rename is always allowed.
  const renamed = await rpc("update_player", {
    p_player_id: g.players[0].player_id, p_name: "Renamed", p_team_id: null,
    p_new_team_name: null, p_new_team_color: null,
  });
  check("a player can rename themselves mid-game", !!renamed?.[0], "no row returned");

  // Team switch mid-clue must be refused.
  await rpc("host_open_clue", { p_host_token: g.token, p_clue_id: "c3-200", p_is_dd: false, p_timer: 12 });
  let midClue = "";
  try {
    await rpc("update_player", {
      p_player_id: g.players[0].player_id, p_name: null, p_team_id: g.players[1].team_id,
      p_new_team_name: null, p_new_team_color: null,
    });
  } catch (e) { midClue = e.message; }
  check("team switch is blocked mid-clue", /TEAM_LOCKED_MID_CLUE/.test(midClue), `got: ${midClue || "no error"}`);
  await rpc("host_close_clue", { p_host_token: g.token });

  // Between clues it should work.
  let ok = true;
  try {
    await rpc("update_player", {
      p_player_id: g.players[0].player_id, p_name: null, p_team_id: g.players[1].team_id,
      p_new_team_name: null, p_new_team_color: null,
    });
  } catch { ok = false; }
  check("team switch works between clues", ok, "blocked when it should be allowed");

  // Last Call must refuse team switches (team membership is the wager ACL).
  await rpc("host_set_phase", { p_host_token: g.token, p_phase: "final_wager", p_timer: null });
  let inFinal = "";
  try {
    await rpc("update_player", {
      p_player_id: g.players[0].player_id, p_name: null, p_team_id: g.players[2].team_id,
      p_new_team_name: null, p_new_team_color: null,
    });
  } catch (e) { inFinal = e.message; }
  check("team switch is blocked during Last Call", /TEAM_LOCKED_IN_FINAL/.test(inFinal), `got: ${inFinal || "no error"}`);
});

// --- 9. Full game playthrough ---------------------------------------------
await suite("game", only, "full game playthrough", async () => {
  const g = await freshGame(3);
  const VALUES = [200, 400, 600, 800, 1000];

  for (let cat = 0; cat < 6; cat++) {
    for (const v of VALUES) {
      const clue = `c${cat}-${v}`;
      await rpc("host_open_clue", { p_host_token: g.token, p_clue_id: clue, p_is_dd: false, p_timer: 12 });
      await rpc("host_open_buzzer", { p_host_token: g.token, p_arm_seconds: 0 });
      const who = g.players[(cat + v) % g.players.length];
      const res = await rpc("claim_buzz", { p_code: g.code, p_player_id: who.player_id, p_clue_id: clue });
      if (res[0]?.won) {
        await rpc("host_award", {
          p_host_token: g.token, p_team_id: who.team_id, p_delta: v,
          p_reason: "correct", p_clue_id: clue, p_label: `${clue} correct`,
        });
      }
      await rpc("host_close_clue", { p_host_token: g.token });
    }
  }

  const r = await room(g.code);
  eq("all 30 clues revealed", r.revealed_clue_ids.length, 30);
  eq("no clue revealed twice", new Set(r.revealed_clue_ids).size, 30);
  const l = await ledgerMatches(g.token, g.roomId);
  check("ledger matches after a full 30-clue game", l.ok, l.bad.join("; "));

  // Final round end to end.
  await rpc("host_set_phase", { p_host_token: g.token, p_phase: "final_wager", p_timer: null });
  const teams = await teamsOf(g.roomId);
  for (const p of g.players) {
    const t = teams.find((x) => x.id === p.team_id);
    await rpc("submit_final", { p_player_id: p.player_id, p_wager: Math.max(t.score, 0), p_answer: null });
  }
  await rpc("host_set_phase", { p_host_token: g.token, p_phase: "final_clue", p_timer: 60 });
  for (const p of g.players) {
    await rpc("submit_final", { p_player_id: p.player_id, p_wager: null, p_answer: "Barbenheimer" });
  }
  await rpc("host_set_phase", { p_host_token: g.token, p_phase: "final_reveal", p_timer: null });

  const finals = await rpc("host_get_finals", { p_host_token: g.token });
  eq("every team has a final submission", finals.length, 3);
  const overWagered = finals.filter((f) => f.wager > Math.max(f.score, 0));
  eq("no team wagered more than its score", overWagered.length, 0);

  // Wagers must be locked now.
  let locked = false;
  try {
    await rpc("submit_final", { p_player_id: g.players[0].player_id, p_wager: 99999, p_answer: null });
  } catch { locked = true; }
  check("finals are locked after reveal starts", locked, "a wager was accepted after lock");

  await rpc("host_set_phase", { p_host_token: g.token, p_phase: "results", p_timer: null });
  eq("game reaches results", (await room(g.code)).phase, "results");

  // Reset returns a clean lobby.
  await rpc("host_reset_game", { p_host_token: g.token, p_pack_id: null });
  const reset = await room(g.code);
  eq("reset returns to lobby", reset.phase, "lobby");
  eq("reset clears the board", reset.revealed_clue_ids.length, 0);
  eq("reset zeroes scores", (await teamsOf(g.roomId)).every((t) => t.score === 0), true);
  eq("reset clears the score log", (await rpc("host_get_score_log", { p_host_token: g.token })).length, 0);
});

// =========================================================== report =========
const failed = results.filter((r) => !r.pass);
console.log(`\n\n${"=".repeat(70)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log(`\n${failed.length} FAILURES:\n`);
  let s = "";
  for (const f of failed) {
    if (f.suite !== s) { console.log(`  [${f.suite}]`); s = f.suite; }
    console.log(`    x ${f.name}\n      ${f.detail}`);
  }
}
console.log("=".repeat(70));
process.exit(failed.length ? 1 : 0);
