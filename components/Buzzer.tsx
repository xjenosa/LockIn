"use client";

import { useEffect, useRef, useState } from "react";
import { claimBuzz } from "@/lib/api";
import { serverNow } from "@/lib/serverClock";
import type { Room, Team } from "@/lib/types";

// The full-screen phone buzzer. The server decides who was first (claim_buzz
// row lock); this component only fires the RPC fast and renders the shared
// verdict. Latency rule (BRAND.md): nothing may animate between tap and
// verdict render.
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

  // Timebase: serverNow(), never Date.now(). See lib/serverClock.ts.
  const armsIn = room.buzzer_arms_at
    ? Math.max(0, Date.parse(room.buzzer_arms_at) - serverNow())
    : 0;

  const lockedOut = room.locked_out_team_ids.includes(myTeam.id);
  const buzzedTeam = teams.find((t) => t.id === room.buzzed_team_id) ?? null;
  const weWon = room.buzzed_team_id === myTeam.id;
  // buzzer_open guard: host_reveal_answer clears buzzer_open but leaves
  // buzzer_arms_at set, which must not read as "arming".
  const arming = room.buzzer_open && armsIn > 0;
  const canBuzz =
    room.buzzer_open && armsIn <= 0 && !room.buzzed_team_id && !lockedOut &&
    !localBuzzed && !room.active_is_dd;

  const buzz = () => {
    if (!canBuzz || !room.active_clue_id) return;
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
  } else if (arming) {
    // Button stays disabled while arming so early taps never reach claim_buzz
    // (which would refuse them server-side anyway; this saves the round trip).
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
      disabled={!canBuzz}
      className={`w-full flex-1 rounded-3xl font-display text-4xl leading-tight whitespace-pre-line
        flex items-center justify-center text-center select-none touch-manipulation transition ${cls}`}
    >
      {label}
    </button>
  );
}
