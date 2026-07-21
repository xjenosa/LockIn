"use client";

import { useEffect, useRef, useState } from "react";
import { joinRoom } from "@/lib/api";
import { TEAM_COLORS } from "@/lib/game";
import type { Team } from "@/lib/types";

// Shared so callers that run their own RPC (the play page's edit sheet calls
// update_player) surface the exact same wording.
export const FRIENDLY: Record<string, string> = {
  ROOM_NOT_FOUND: "Room not found — check the code!",
  TEAM_NAME_TAKEN: "That team name is taken — pick another.",
  TEAM_NAME_REQUIRED: "Give your team a name!",
  TEAM_NOT_FOUND: "That team is gone — pick another one.",
  PLAYER_NOT_FOUND: "We lost your player — rejoin the room.",
};

// Two modes: a fresh join (default) and editing an existing player, where the
// caller supplies onSubmit so the same UI drives update_player instead.
export default function TeamJoin({
  code,
  teams,
  onJoined,
  initialName = "",
  initialTeamId = "",
  submitLabel,
  onCancel,
  onSubmit,
}: {
  code: string;
  teams: Team[];
  onJoined: (identity: { playerId: string; teamId: string; name: string }) => void;
  initialName?: string;
  initialTeamId?: string;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit?: (v: {
    name: string;
    teamId?: string;
    newTeamName?: string;
    newTeamColor?: string;
  }) => Promise<{ player_id: string; team_id: string; team_name: string }>;
}) {
  const [name, setName] = useState(initialName);
  const [mode, setMode] = useState<"join" | "create">(teams.length ? "join" : "create");
  const [teamName, setTeamName] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]);
  const [selectedTeam, setSelectedTeam] = useState<string>(initialTeamId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modeTouched = useRef(false);

  // teams is [] on first render (useRoom hasn't fetched yet) and a useState
  // initializer never re-runs — without this everyone lands on "Create a team".
  useEffect(() => {
    if (!modeTouched.current && teams.length) setMode("join");
  }, [teams.length]);

  const pickMode = (m: "join" | "create") => {
    modeTouched.current = true;
    setMode(m);
  };

  const submit = async () => {
    if (!name.trim()) return setError("Enter your name first!");
    if (mode === "create" && !teamName.trim()) return setError("Give your team a name!");
    if (mode === "join" && !selectedTeam) return setError("Pick a team to join!");
    setBusy(true);
    setError(null);
    try {
      const res = onSubmit
        ? await onSubmit({
            name: name.trim(),
            teamId: mode === "join" ? selectedTeam : undefined,
            newTeamName: mode === "create" ? teamName.trim() : undefined,
            newTeamColor: mode === "create" ? color : undefined,
          })
        : await joinRoom({
            code,
            playerName: name.trim(),
            teamName: mode === "create" ? teamName.trim() : undefined,
            teamColor: color,
            existingTeamId: mode === "join" ? selectedTeam : undefined,
          });
      onJoined({ playerId: res.player_id, teamId: res.team_id, name: name.trim() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(FRIENDLY[msg] ?? msg);
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      <label className="block">
        <span className="text-white/70 text-sm">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-4 text-lg"
          placeholder="e.g. Maxi"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => pickMode("join")}
          disabled={!teams.length}
          className={`rounded-xl py-3 font-semibold border ${
            mode === "join" ? "bg-gold text-boarddark border-gold" : "border-white/20 disabled:opacity-40"
          }`}
        >
          Join a team
        </button>
        <button
          onClick={() => pickMode("create")}
          className={`rounded-xl py-3 font-semibold border ${
            mode === "create" ? "bg-gold text-boarddark border-gold" : "border-white/20"
          }`}
        >
          Create a team
        </button>
      </div>

      {mode === "join" ? (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTeam(t.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border text-left ${
                selectedTeam === t.id ? "border-gold bg-gold/10" : "border-white/15 bg-black/20"
              }`}
            >
              <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              <span className="font-semibold">{t.name}</span>
              {t.id === initialTeamId && <span className="ml-auto text-white/40 text-xs">current</span>}
            </button>
          ))}
        </div>
      ) : (
        <>
          <label className="block">
            <span className="text-white/70 text-sm">Team name</span>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={28}
              className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-4 text-lg"
              placeholder="e.g. Git Blamers"
            />
          </label>
          <div className="flex gap-2 flex-wrap">
            {TEAM_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full border-2 ${
                  color === c ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </>
      )}

      {error && <p className="text-red-300 text-center">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-2xl bg-green-500 py-4 font-display text-2xl disabled:opacity-50"
      >
        {busy ? (onSubmit ? "Saving…" : "Joining…") : submitLabel ?? "Let's go! 🚀"}
      </button>

      {onCancel && (
        <button
          onClick={onCancel}
          disabled={busy}
          className="w-full rounded-xl border border-white/20 py-3 text-white/70 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
