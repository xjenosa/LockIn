"use client";

import { useEffect, useRef, useState } from "react";
import { claimBuzz } from "@/lib/api";
import { serverNow } from "@/lib/serverClock";
import type { Room, Team } from "@/lib/types";

// The full-screen phone buzzer. The server decides who was first; this
// component just fires the RPC fast and renders the shared verdict.
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

  // New clue (or steal reopen) -> re-arm the local button. buzzer_arms_at is in
  // the key because a steal reopen restores the exact pre-buzz values of the
  // other three: a client that coalesced the intermediate row (60ms debounce, or
  // the 5s poll fallback) would never see the key change and would sit out.
  useEffect(() => {
    const key = `${room.active_clue_id}:${room.buzzer_open}:${room.buzzed_team_id}:${room.buzzer_arms_at}`;
    if (key !== lastArm.current) {
      lastArm.current = key;
      if (room.buzzer_open && !room.buzzed_team_id) setLocalBuzzed(false);
    }
  }, [room.active_clue_id, room.buzzer_open, room.buzzed_team_id, room.buzzer_arms_at]);

  // Anti-spam countdown. This effect only pulses a re-render; armsIn itself is
  // derived below, because in state it would spend the first frame after a fresh
  // buzzer_arms_at at 0 and paint a live BUZZ button that claim_buzz then
  // refuses. It stores the remaining time so React bails out once that settles
  // at 0. Every open AND every steal reopen stamps a new buzzer_arms_at, so
  // keying on it alone restarts the count. Null = old room, already armed.
  useEffect(() => {
    if (!room.buzzer_arms_at) return;
    const at = Date.parse(room.buzzer_arms_at);
    const id = setInterval(() => setTick(Math.max(0, at - serverNow())), 100);
    return () => clearInterval(id);
  }, [room.buzzer_arms_at]);

  // serverNow(), not Date.now(): buzzer_arms_at is the DB's clock, and a device
  // a few seconds off would arm late (loses every race) or early (tap eaten).
  const armsIn = room.buzzer_arms_at
    ? Math.max(0, Date.parse(room.buzzer_arms_at) - serverNow())
    : 0;

  const lockedOut = room.locked_out_team_ids.includes(myTeam.id);
  const buzzedTeam = teams.find((t) => t.id === room.buzzed_team_id) ?? null;
  const weWon = room.buzzed_team_id === myTeam.id;
  // host_reveal_answer leaves buzzer_arms_at behind, hence the buzzer_open guard.
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
    // A refused claim (arms_at not reached, wifi hiccup) changes nothing in
    // `rooms`, so the optimistic latch has to be released here or the player is
    // stuck on "…" for the rest of the clue. Losing a real race is still
    // covered: buzzed_team_id and lockedOut re-disable the button on their own.
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
    // Disabled, so early taps are dropped before they ever reach claim_buzz.
    label = `⏳ GET READY\n${Math.ceil(armsIn / 1000)}`;
    cls = "bg-white text-ink";
  } else if (canBuzz) {
    label = "BLARE!";
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
