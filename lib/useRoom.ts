"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncServerClock } from "./serverClock";
import { supabase } from "./supabaseClient";
import type { Player, Room, Team } from "./types";

// Live room state. Three redundant update paths, all funneling into fetchAll:
// realtime change events (fast path), a 5s poll (works even when the Realtime
// publication is missing), and a visibilitychange refetch (phones returning
// from sleep). Consumers must tolerate coalesced updates: bursts collapse into
// one refetch, so intermediate row states may never be observed. Buzzer.tsx
// re-arm logic is written around exactly that.
export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notFound, setNotFound] = useState(false);
  const roomIdRef = useRef<string | null>(null);
  const pendingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    const { data: r } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle();
    if (!r) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    roomIdRef.current = r.id;
    setRoom(r as Room);
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("teams").select("*").eq("room_id", r.id).order("created_at"),
      supabase.from("players").select("*").eq("room_id", r.id).order("created_at"),
    ]);
    setTeams((t as Team[]) ?? []);
    setPlayers((p as Player[]) ?? []);
  }, [code]);

  // Collapse event bursts into one refetch after 60ms of quiet-ish arrival.
  const scheduleRefetch = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setTimeout(() => {
      pendingRef.current = false;
      void fetchAll();
    }, 60);
  }, [fetchAll]);

  useEffect(() => {
    void fetchAll();
    void syncServerClock(); // one-time skew sync; see lib/serverClock.ts

    // rooms filters server-side by code. teams/players cannot (their rows only
    // carry room_id, unknown until the first fetch), so they subscribe to the
    // whole table and filter client-side against roomIdRef.
    const channel = supabase
      .channel(`room-${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code.toUpperCase()}` },
        scheduleRefetch
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { room_id?: string };
          if (!roomIdRef.current || row?.room_id === roomIdRef.current) scheduleRefetch();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { room_id?: string };
          if (!roomIdRef.current || row?.room_id === roomIdRef.current) scheduleRefetch();
        }
      )
      .subscribe();

    const poll = setInterval(() => void fetchAll(), 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchAll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, fetchAll, scheduleRefetch]);

  return { room, teams, players, notFound, refetch: fetchAll };
}
