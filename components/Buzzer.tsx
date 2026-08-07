"use client";

import { useEffect, useRef, useState } from "react";
import { claimBuzz } from "@/lib/api";
import { serverNow } from "@/lib/serverClock";
import type { Room, Team } from "@/lib/types";

// The full-screen phone buzzer. The server decides who was first (claim_buzz
// row lock); this component only fires the RPC fast and renders the shared
// verdict. Latency rule (BRAND.md): nothing may animate between tap and
// verdict render.
//
// Anti-spam: a tap during the arming countdown is a false start, not a buzz. It
// locks the phone out for PENALTY_MS after buzzers open, so mashing through the
// countdown loses to a clean reaction. This also enforces fresh-press: a buzz
// only ever fires from a new pointerdown while live, never a press carried in
// from arming.
const PENALTY_MS = 750;

export default function Buzzer({
  room,
  myTeam,
  teams,
  playerId,
}: {
  room: Room;
  myTeam: Team;
  teams: Team[];
  playerId: string;
}) {
  const [localBuzzed, setLocalBuzzed] = useState(false);
  // False-start latch: set when this phone taps during the arming countdown.
  const [jumped, setJumped] = useState(false);
  const [, setTick] = useState(0);
  const lastArm = useRef<string | null>(null);

  // New clue (or steal reopen) -> release the local latch. buzzer_arms_at is in
  // the key because a steal reopen restores the exact pre-buzz values of the
  // other three fields: useRoom coalesces bursts (60ms debounce, 5s poll), so a
  // client may never observe the intermediate row, and without arms_at in the
  // key it would sit out the steal.
  useEffect(() => {
    const key = `${room.active_clue_id}:${room.buzzer_open}:${room.buzzed_team_id}:${room.buzzer_arms_at}`;
    if (key !== lastArm.current) {
      lastArm.current = key;
      setJumped(false); // each new clue / steal reopen is a fresh false-start chance
      if (room.buzzer_open && !room.buzzed_team_id) setLocalBuzzed(false);
    }
  }, [room.active_clue_id, room.buzzer_open, room.buzzed_team_id, room.buzzer_arms_at]);

  // Arming countdown. The effect only pulses re-renders; armsIn is derived at
  // render because effect state would spend the first frame after a fresh
  // buzzer_arms_at at 0 and paint a live button that claim_buzz then refuses.
  // setTick stores the remaining ms so React bails out once it settles at 0.
  // Every open and every steal reopen stamps a new buzzer_arms_at, so keying
  // on it alone restarts the count. Null arms_at = pre-migration room, treat
  // as already armed.
  useEffect(() => {
    if (!room.buzzer_arms_at) return;
    const at = Date.parse(room.buzzer_arms_at);
    const id = setInterval(() => setTick(Math.max(0, at - serverNow())), 100);
    return () => clearInterval(id);
  }, [room.buzzer_arms_at]);

  // A false-start lockout lifts PENALTY_MS after buzzers open. The arming ticker
  // has already settled at 0 by then, so schedule the single re-render that
  // re-enables the button; without it the phone stays locked until the next
  // room push.
  useEffect(() => {
    if (!jumped || !room.buzzer_arms_at) return;
    const ms = Date.parse(room.buzzer_arms_at) + PENALTY_MS - serverNow();
    if (ms <= 0) return;
    const id = setTimeout(() => setTick((t) => t + 1), ms);
    return () => clearTimeout(id);
  }, [jumped, room.buzzer_arms_at]);

  // Timebase: serverNow(), never Date.now(). See lib/serverClock.ts.
  const armsIn = room.buzzer_arms_at
    ? Math.max(0, Date.parse(room.buzzer_arms_at) - serverNow())
    : 0;
  // Remaining false-start penalty: 0 unless this phone jumped, then counting
  // down from the open moment. A jumped phone cannot buzz until it reaches 0.
  const penaltyLeft =
    jumped && room.buzzer_arms_at
      ? Math.max(0, Date.parse(room.buzzer_arms_at) + PENALTY_MS - serverNow())
      : 0;

  const lockedOut = room.locked_out_team_ids.includes(myTeam.id);
  const buzzedTeam = teams.find((t) => t.id === room.buzzed_team_id) ?? null;
  const weWon = room.buzzed_team_id === myTeam.id;
  // buzzer_open guard: host_reveal_answer clears buzzer_open but leaves
  // buzzer_arms_at set, which must not read as "arming".
  const arming = room.buzzer_open && armsIn > 0;
  const canBuzz =
    room.buzzer_open && armsIn <= 0 && !room.buzzed_team_id && !lockedOut &&
    !localBuzzed && !room.active_is_dd && penaltyLeft <= 0;

  const buzz = () => {
    if (!room.active_clue_id) return;
    // Tap during the countdown = false start: latch the penalty (once) and bail.
    // The button is deliberately live during arming so we catch this here instead
    // of swallowing it with a disabled attribute.
    if (arming) {
      if (!jumped) {
        setJumped(true);
        try {
          navigator.vibrate?.([30, 30, 30]);
        } catch {}
      }
      return;
    }
    if (!canBuzz) return;
    setLocalBuzzed(true);
    try {
      navigator.vibrate?.(80);
    } catch {}
    // A refused claim (arms_at not reached, network hiccup) changes nothing in
    // rooms, so no realtime event will ever release the optimistic latch; it
    // must be released here or the player is stuck on the pending state for the
    // rest of the clue. Losing a real race needs no handling: buzzed_team_id
    // and lockedOut disable the button through room state.
    void claimBuzz(room.code, playerId, room.active_clue_id)
      .then((r) => {
        if (!r?.won) setLocalBuzzed(false);
      })
      .catch(() => setLocalBuzzed(false));
  };

  let label: string;
  let cls: string;
  if (room.active_is_dd) {
    label = "🃏 WILDCARD\nLook up!";
    cls = "bg-flare text-ink";
  } else if (weWon) {
    label = "🚨 YOU'RE FIRST!\nAnswer out loud!";
    cls = "bg-signal text-ink";
  } else if (buzzedTeam) {
    label = `🔒 ${buzzedTeam.name} buzzed`;
    cls = "bg-tile text-white/80";
  } else if (lockedOut) {
    label = "😬 Locked out\n(wrong answer)";
    cls = "bg-loss/20 text-white/80";
  } else if (jumped && (arming || penaltyLeft > 0)) {
    // False-started: the countdown tap costs them. Held through the open moment
    // and PENALTY_MS past it, so a clean reactor gets a clear head start.
    label = "🚫 Too soon!\nDon't spam";
    cls = "bg-loss/30 text-white";
  } else if (arming) {
    // Live (not disabled) during arming so a tap here registers as a false start;
    // buzz() turns it into the penalty above instead of a claim.
    label = `⏳ GET READY\n${Math.ceil(armsIn / 1000)}`;
    cls = "bg-white text-ink";
  } else if (canBuzz) {
    label = "LOCK IN!";
    cls = "bg-signal text-ink animate-pulseglow active:scale-95";
  } else if (localBuzzed && room.buzzer_open) {
    label = "…";
    cls = "bg-signal/30";
  } else {
    label = room.active_clue_id ? "🔒 Wait for it…" : "👀 Look at the board";
    cls = "bg-tile text-white/60";
  }

  return (
    <button
      onPointerDown={buzz}
      disabled={!(arming || canBuzz)}
      className={`w-full flex-1 rounded-3xl font-display text-4xl leading-tight whitespace-pre-line
        flex items-center justify-center text-center select-none touch-manipulation transition ${cls}`}
    >
      {label}
    </button>
  );
}
