"use client";

import { fmtScore } from "@/lib/game";
import type { Team } from "@/lib/types";

export default function Leaderboard({
  teams,
  highlightTeamId,
  big = false,
}: {
  teams: Team[];
  highlightTeamId?: string | null;
  big?: boolean;
}) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-2">
      {sorted.map((t, i) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-xl px-4 ${
            big ? "py-4 text-2xl" : "py-2 text-base"
          } bg-black/30 border ${
            t.id === highlightTeamId ? "border-gold" : "border-white/10"
          }`}
        >
          <span className={`font-display ${big ? "text-3xl w-12" : "text-xl w-8"} text-center`}>
            {medals[i] ?? i + 1}
          </span>
          <span
            className="inline-block h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: t.color }}
          />
          <span className="flex-1 truncate font-semibold">{t.name}</span>
          <span
            className={`font-display ${big ? "text-3xl" : "text-xl"} ${
              t.score < 0 ? "text-red-400" : "text-gold"
            }`}
          >
            {fmtScore(t.score)}
          </span>
        </div>
      ))}
      {sorted.length === 0 && (
        <p className="text-white/60 text-center py-4">No teams yet…</p>
      )}
    </div>
  );
}
