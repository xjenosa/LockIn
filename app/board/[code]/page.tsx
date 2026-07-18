"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import Board from "@/components/Board";
import ClueView from "@/components/ClueView";
import Confetti from "@/components/Confetti";
import Leaderboard from "@/components/Leaderboard";
import QRJoin from "@/components/QRJoin";
import Timer from "@/components/Timer";
import { getPack } from "@/content/packs";
import { fmtScore } from "@/lib/game";
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
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        <h1 className="font-display text-5xl md:text-7xl text-gold text-shadow-board">BUZZER!</h1>
        <p className="text-white/70 text-2xl">📱 Scan to join — pick or create a team</p>
        <QRJoin code={code} big />
        <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
          {teams.map((t) => (
            <span
              key={t.id}
              className="rounded-full px-4 py-2 font-semibold border-2 animate-pop"
              style={{ borderColor: t.color, backgroundColor: "rgba(0,0,0,0.35)" }}
            >
              {t.name}
            </span>
          ))}
        </div>
      </main>
    );
  }

  if (room.phase === "playing") {
    return (
      <main className="min-h-screen p-4 md:p-8 flex flex-col gap-4">
        <div className="flex-1">
          <Board pack={pack} room={room} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {[...teams]
            .sort((a, b) => b.score - a.score)
            .map((t) => (
              <span
                key={t.id}
                className="rounded-xl px-4 py-2 bg-black/40 border border-white/10 font-semibold"
              >
                <span className="inline-block h-3 w-3 rounded-full mr-2" style={{ backgroundColor: t.color }} />
                {t.name}{" "}
                <span className={`font-display ml-1 ${t.score < 0 ? "text-red-400" : "text-gold"}`}>
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
        <p className="font-display text-gold text-3xl tracking-widest uppercase animate-pulse">
          Final Round
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
        <p className="font-display text-gold text-3xl tracking-widest uppercase">The reveal</p>
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
      <p className="font-display text-3xl text-gold tracking-widest uppercase">Champions</p>
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
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      {children}
    </main>
  );
}
