"use client";

import { useState } from "react";
import { joinRoom } from "@/lib/api";
import { TEAM_COLORS } from "@/lib/game";
import type { Team } from "@/lib/types";

const FRIENDLY: Record<string, string> = {
  ROOM_NOT_FOUND: "Room not found — check the code!",
  TEAM_NAME_TAKEN: "That team name is taken — pick another.",
  TEAM_NAME_REQUIRED: "Give your team a name!",
};

export default function TeamJoin({
  code,
  teams,
  onJoined,
}: {
  code: string;
  teams: Team[];
  onJoined: (identity: { playerId: string; teamId: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"join" | "create">(teams.length ? "join" : "create");
  const [teamName, setTeamName] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return setError("Enter your name first!");
    if (mode === "create" && !teamName.trim()) return setError("Give your team a name!");
    if (mode === "join" && !selectedTeam) return setError("Pick a team to join!");
    setBusy(true);
    setError(null);
    try {
      const res = await joinRoom({
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
          onClick={() => setMode("join")}
          disabled={!teams.length}
          className={`rounded-xl py-3 font-semibold border ${
            mode === "join" ? "bg-gold text-boarddark border-gold" : "border-white/20 disabled:opacity-40"
          }`}
        >
          Join a team
        </button>
        <button
          onClick={() => setMode("create")}
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
        {busy ? "Joining…" : "Let's go! 🚀"}
      </button>
    </div>
  );
}
