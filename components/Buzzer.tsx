"use client";

import { useEffect, useRef, useState } from "react";
import { claimBuzz } from "@/lib/api";
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
  const [armsIn, setArmsIn] = useState(0);
  const lastClue = useRef<string | null>(null);

  // New clue (or steal reopen) -> re-arm the local button.
  useEffect(() => {
    const key = `${room.active_clue_id}:${room.buzzer_open}:${room.buzzed_team_id}`;
    if (key !== lastClue.current) {
      lastClue.current = key;
      if (room.buzzer_open && !room.buzzed_team_id) setLocalBuzzed(false);
    }
  }, [room.active_clue_id, room.buzzer_open, room.buzzed_team_id]);

  // Anti-spam countdown. Every open AND every steal reopen stamps a fresh
  // buzzer_arms_at, so keying on it alone restarts the count. Null = old room,
  // already armed.
  useEffect(() => {
    if (!room.buzzer_arms_at) {
      setArmsIn(0);
      return;
    }
    const at = new Date(room.buzzer_arms_at).getTime();
    const tick = () => setArmsIn(Math.max(0, at - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [room.buzzer_arms_at]);

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
    void claimBuzz(room.code, playerId, room.active_clue_id);
  };

  let label: string;
  let cls: string;
  if (room.active_is_dd) {
    label = "🎯 DAILY DOUBLE\nLook up!";
    cls = "bg-purple-700";
  } else if (weWon) {
    label = "🚀 YOU'RE FIRST!\nAnswer out loud!";
    cls = "bg-gold text-boarddark";
  } else if (buzzedTeam) {
    label = `🔒 ${buzzedTeam.name} buzzed`;
    cls = "bg-boarddark";
  } else if (lockedOut) {
    label = "😬 Locked out\n(wrong answer)";
    cls = "bg-red-900";
  } else if (arming) {
    // Disabled, so early taps are dropped before they ever reach claim_buzz.
    label = `⏳ GET READY\n${Math.ceil(armsIn / 1000)}`;
    cls = "bg-amber-500 text-boarddark";
  } else if (canBuzz) {
    label = "BUZZ!";
    cls = "bg-green-500 animate-pulseglow active:scale-95";
  } else if (localBuzzed && room.buzzer_open) {
    label = "…";
    cls = "bg-green-800";
  } else {
    label = room.active_clue_id ? "🔒 Wait for it…" : "👀 Look at the board";
    cls = "bg-red-800/80";
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
