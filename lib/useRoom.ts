"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import type { Player, Room, Team } from "./types";

// Live room state: realtime subscription + refetch-on-event, with a slow
// polling fallback so the game still works if Realtime isn't enabled.
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

  // Collapse bursts of change events into one refetch.
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
