"use client";

import { useEffect, useRef, useState } from "react";
import { joinRoom } from "@/lib/api";
import { TEAM_COLORS } from "@/lib/game";
import type { Team } from "@/lib/types";

// Error-code copy map. Keys are the SCREAMING_SNAKE codes raised by
// supabase/functions.sql (join_room / update_player); keep in sync with the
// SQL. Exported because the play page's edit sheet calls update_player itself
// and must surface identical wording.
export const FRIENDLY: Record<string, string> = {
  ROOM_NOT_FOUND: "Room not found. Check the code!",
  TEAM_NAME_TAKEN: "That team name is taken. Pick another.",
  TEAM_NAME_REQUIRED: "Give your team a name!",
  TEAM_NOT_FOUND: "That team is gone. Pick another one.",
  PLAYER_NOT_FOUND: "We lost your player. Rejoin the room.",
  TEAM_LOCKED_IN_FINAL: "Teams are locked for Last Call. Ask your host.",
  TEAM_LOCKED_MID_CLUE: "Can't switch teams mid-clue. Try between clues.",
  GAME_CLOSED: "This game has already finished. Ask your host to start a new round.",
};

// One form, two modes: fresh join (default, calls joinRoom) and editing an
// existing player (caller supplies onSubmit wired to update_player). nameOnly
// drops the team half of the form in the phases where the server would refuse
// a team change anyway (mid-clue, Last Call onward); the caller decides when.
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

  // Mode auto-correction. teams is [] on first render (useRoom hasn't fetched)
  // and a useState initializer never re-runs, so without this effect everyone
  // would land on "Create a team". Flip to "join" only on the FIRST arrival of
  // teams, never after the user touched the toggle, and never once they have
  // started typing a team name: the first player in the room is usually
  // mid-type in Create when everyone else's teams land, and yanking them to
  // the join list would discard their input.
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
            // nameOnly sends no team fields at all, which routes update_player
            // into its keep-current-team branch.
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
          Teams are locked while a clue is live and through Last Call, but you
          can still fix your name.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => pickMode("join")}
              disabled={!teams.length}
              className={`rounded-xl py-3 font-semibold border ${
                mode === "join"
                  ? "bg-signal text-ink border-signal"
                  : "border-white/20 disabled:opacity-40"
              }`}
            >
              Join a team
            </button>
            <button
              onClick={() => pickMode("create")}
              className={`rounded-xl py-3 font-semibold border ${
                mode === "create" ? "bg-signal text-ink border-signal" : "border-white/20"
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
                    selectedTeam === t.id ? "border-signal bg-signal/10" : "border-white/15 bg-white/[0.04]"
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

      {error && <p className="text-loss text-center">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-2xl bg-signal text-ink py-4 font-display text-2xl disabled:opacity-50"
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
