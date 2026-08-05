"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import Board from "@/components/Board";
import ClueView from "@/components/ClueView";
import Confetti from "@/components/Confetti";
import Leaderboard from "@/components/Leaderboard";
import QRJoin from "@/components/QRJoin";
import Timer from "@/components/Timer";
import Wordmark from "@/components/Wordmark";
import { getPack } from "@/content/packs";
import { fmtScore, lockedCategoryIdx } from "@/lib/game";
import { useRoom } from "@/lib/useRoom";

// Read-only projector view. Put THIS on the big screen; keep host controls
// on your laptop at /host/[code].
export default function Projector() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const { room, teams, notFound } = useRoom(code);
  const pack = useMemo(() => (room ? getPack(room.pack_id) : undefined), [room]);

  if (notFound) return <Center>Room {code} not found.</Center>;
  if (!room || !pack) return <Center>Loading…</Center>;

  if (room.phase === "lobby") {
    return (
      <main className="relative min-h-dvh flex flex-col items-center justify-center gap-8 p-8">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_-10%,rgba(37,230,196,0.12),transparent_55%)]" />
        <Wordmark className="relative text-5xl md:text-7xl" />
        <p className="relative text-white/70 text-2xl">📱 Scan to join: pick or create a team</p>
        <QRJoin code={code} big />
        <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
          {teams.map((t) => (
            <span
              key={t.id}
              className="rounded-full px-4 py-2 font-semibold border-2 animate-pop"
              style={{ borderColor: t.color, backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              {t.name}
            </span>
          ))}
        </div>
      </main>
    );
  }

  if (room.phase === "playing") {
    // Turn order rotates team-to-team, so the room can only follow along if the
    // projector says whose pick it is.
    const controlTeam = teams.find((t) => t.id === room.control_team_id) ?? null;
    return (
      <main className="min-h-dvh p-4 md:p-8 flex flex-col gap-4">
        <div className="flex-1">
          <Board pack={pack} room={room} lockedCatIdx={lockedCategoryIdx(room, pack)} />
        </div>
        <div className="flex justify-center">
          {controlTeam ? (
            <div
              key={controlTeam.id}
              className="animate-pop rounded-2xl border-4 px-6 py-2 md:px-10 md:py-3 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1"
              style={{ borderColor: controlTeam.color, backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <span
                className="font-display text-3xl md:text-5xl"
                style={{ color: controlTeam.color }}
              >
                {controlTeam.name}
              </span>
              <span className="text-white/70 uppercase tracking-widest text-sm md:text-xl">
                picks next
              </span>
            </div>
          ) : (
            <p className="font-display uppercase tracking-widest text-white/50 text-xl md:text-3xl">
              Host picks next
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {[...teams]
            .sort((a, b) => b.score - a.score)
            .map((t) => (
              <span
                key={t.id}
                className="rounded-xl px-4 py-2 bg-white/[0.06] border border-white/10 font-semibold"
              >
                <span className="inline-block h-3 w-3 rounded-full mr-2" style={{ backgroundColor: t.color }} />
                {t.name}{" "}
                <span className={`font-display ml-1 ${t.score < 0 ? "text-loss" : "text-signal"}`}>
                  {fmtScore(t.score)}
                </span>
              </span>
            ))}
        </div>
        {room.active_clue_id && (
          <ClueView pack={pack} room={room} teams={teams} isHost={false} />
        )}
      </main>
    );
  }

  if (room.phase === "final_wager" || room.phase === "final_clue") {
    return (
      <Center>
        <p className="font-display text-flare glow-flare text-3xl tracking-widest uppercase animate-pulse">
          Last Call
        </p>
        <h1 className="font-display text-5xl md:text-7xl my-8 max-w-5xl">
          {room.phase === "final_wager" ? pack.final.category : pack.final.clue}
        </h1>
        {room.phase === "final_wager" ? (
          <p className="text-white/70 text-2xl">Teams are wagering on their phones… 🤫</p>
        ) : (
          <div className="w-full max-w-2xl">
            <Timer openedAt={room.clue_opened_at} seconds={room.timer_seconds} />
            <p className="text-white/70 text-xl mt-4">Type your team&apos;s response on your phone!</p>
          </div>
        )}
      </Center>
    );
  }

  if (room.phase === "final_reveal") {
    return (
      <Center>
        <p className="font-display text-flare text-3xl tracking-widest uppercase">The reveal</p>
        <p className="font-display text-2xl md:text-4xl my-6 max-w-4xl text-white/90">
          {pack.final.clue}
        </p>
        <div className="w-full max-w-2xl">
          <Leaderboard teams={teams} big />
        </div>
      </Center>
    );
  }

  const winner = [...teams].sort((a, b) => b.score - a.score)[0];
  return (
    <Center>
      <Confetti />
      <p className="font-display text-3xl text-signal tracking-widest uppercase">Champions</p>
      {winner && (
        <h1 className="font-display text-6xl md:text-8xl my-6 animate-pop" style={{ color: winner.color }}>
          {winner.name} 🏆
        </h1>
      )}
      <div className="w-full max-w-2xl mt-4">
        <Leaderboard teams={teams} big />
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-8 text-center">
      {children}
    </main>
  );
}
