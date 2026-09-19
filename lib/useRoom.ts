"use client";

import { useCallback, useEffect, useState } from "react";
import { syncServerClock } from "./serverClock";
import type { Player, Room, Team } from "./types";

// Live room state, fetched from app/api/room/[code] (one round trip for room +
// teams + players).
//
// Supabase Realtime is gone -- Neon has no equivalent -- so the poll IS the
// update path now rather than a fallback, hence POLL_MS below instead of the old
// 5s. Two things funnel into fetchAll: that interval, and a visibilitychange
// refetch for phones coming back from sleep.
//
// The interval SKIPS hidden tabs, which is not mere politeness: a forgotten open
// tab polling forever would hold Neon's compute awake and burn free-tier hours,
// quietly recreating the always-on cost we left Supabase to escape. Pausing
// while hidden is what lets Neon suspend between games.
//
// Consumers must tolerate coalesced updates: bursts collapse into one refetch,
// so intermediate row states may never be observed. Buzzer.tsx's re-arm logic
// is written around exactly that.
const POLL_MS = 1500;

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${encodeURIComponent(code.toUpperCase())}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return; // transient server error: keep the last good state
      const data = (await res.json()) as {
        room: Room;
        teams: Team[];
        players: Player[];
      };
      setNotFound(false);
      setRoom(data.room);
      setTeams(data.teams ?? []);
      setPlayers(data.players ?? []);
    } catch {
      // Offline, or a request dropped as the phone changed networks. Hold the
      // last good state and try again next tick rather than blanking the board
      // mid-game.
    }
  }, [code]);

  useEffect(() => {
    void fetchAll();
    void syncServerClock(); // one-time skew sync; see lib/serverClock.ts

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void fetchAll();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchAll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, fetchAll]);

  return { room, teams, players, notFound, refetch: fetchAll };
}
