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
  TEAM_LOCKED_IN_FINAL: "Teams are locked for the Final Round — ask your host.",
  TEAM_LOCKED_MID_CLUE: "Can't switch teams mid-clue — try between clues.",
  GAME_CLOSED: "This game has already finished — ask your host to start a new round.",
};

// Two modes: a fresh join (default) and editing an existing player, where the
// caller supplies onSubmit so the same UI drives update_player instead.
// nameOnly drops the team half of the form for the phases where the server
// refuses a team change anyway.
export default function TeamJoin({
  code,
  teams,
  onJoined,
  initialName = "",
  initialTeamId = "",
  submitLabel,
  nameOnly = false,
  onCancel,
  onSubmit,
}: {
  code: string;
  teams: Team[];
  onJoined: (identity: { playerId: string; teamId: string; name: string }) => void;
  initialName?: string;
  initialTeamId?: string;
  submitLabel?: string;
  nameOnly?: boolean;
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
  const autoJoined = useRef(false);

  // teams is [] on first render (useRoom hasn't fetched yet) and a useState
  // initializer never re-runs — without this everyone lands on "Create a team".
  // Only the first arrival counts, and never once they've started naming a team:
  // the very first player is mid-type in the Create form when everyone else's
  // teams land, and switching them to the list throws that away.
  useEffect(() => {
    if (modeTouched.current || autoJoined.current || !teams.length || teamName.trim()) return;
    autoJoined.current = true;
    setMode("join");
  }, [teams.length, teamName]);

  const pickMode = (m: "join" | "create") => {
    modeTouched.current = true;
    setMode(m);
  };

  const submit = async () => {
    if (!name.trim()) return setError("Enter your name first!");
    if (!nameOnly && mode === "create" && !teamName.trim()) return setError("Give your team a name!");
    if (!nameOnly && mode === "join" && !selectedTeam) return setError("Pick a team to join!");
    setBusy(true);
    setError(null);
    try {
      const res = onSubmit
        ? await onSubmit({
            // No team fields at all -> update_player takes its name-only branch.
            name: name.trim(),
            teamId: !nameOnly && mode === "join" ? selectedTeam : undefined,
            newTeamName: !nameOnly && mode === "create" ? teamName.trim() : undefined,
            newTeamColor: !nameOnly && mode === "create" ? color : undefined,
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
          placeholder="e.g. Max"
        />
      </label>

      {nameOnly ? (
        <p className="text-white/50 text-sm">
          Teams are locked while a clue is live and through the Final Round — you can
          still fix your name.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => pickMode("join")}
              disabled={!teams.length}
              className={`rounded-xl py-3 font-semibold border ${
                mode === "join"
                  ? "bg-gold text-boarddark border-gold"
                  : "border-white/20 disabled:opacity-40"
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
                  {t.id === initialTeamId && (
                    <span className="ml-auto text-white/40 text-xs">current</span>
                  )}
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
                  placeholder="e.g. Codexperts"
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
