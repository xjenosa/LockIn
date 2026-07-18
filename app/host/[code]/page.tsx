"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Board from "@/components/Board";
import ClueView from "@/components/ClueView";
import Confetti from "@/components/Confetti";
import Leaderboard from "@/components/Leaderboard";
import QRJoin from "@/components/QRJoin";
import Timer from "@/components/Timer";
import { getPack } from "@/content/packs";
import {
  hostAward,
  hostCloseClue,
  hostGetFinals,
  hostOpenBuzzer,
  hostOpenClue,
  hostReopenAfterMiss,
  hostResetGame,
  hostRevealAnswer,
  hostSetDDWager,
  hostSetPhase,
  hostStartGame,
} from "@/lib/api";
import { fmtScore, boardDone } from "@/lib/game";
import { getHostToken } from "@/lib/identity";
import type { FinalEntry } from "@/lib/types";
import { useRoom } from "@/lib/useRoom";

export default function HostGame() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const { room, teams, players, notFound } = useRoom(code);
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);

  // Final reveal state
  const [finals, setFinals] = useState<FinalEntry[] | null>(null);
  const [revealIdx, setRevealIdx] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);

  useEffect(() => {
    setToken(getHostToken(code));
    setTokenChecked(true);
  }, [code]);

  useEffect(() => {
    if (room?.phase === "final_reveal" && token && finals === null) {
      void hostGetFinals(token).then((rows) => {
        // Traditional reveal: lowest pre-wager score first.
        setFinals([...rows].sort((a, b) => a.score - b.score));
      });
    }
    if (room?.phase !== "final_reveal" && finals !== null) {
      setFinals(null);
      setRevealIdx(0);
      setAnswerShown(false);
    }
  }, [room?.phase, token, finals]);

  const pack = useMemo(() => (room ? getPack(room.pack_id) : undefined), [room]);

  if (notFound) return <Center>Room {code} not found.</Center>;
  if (!room || !pack || !tokenChecked) return <Center>Loading…</Center>;
  if (!token)
    return (
      <Center>
        <p>
          This browser doesn&apos;t have the host key for room {code}.<br />
          Open the game on the device that created it, or create a new game.
        </p>
        <Link href="/host" className="underline text-gold mt-4 inline-block">
          Create a game
        </Link>
      </Center>
    );

  const t = token;

  // ---------------- lobby ----------------
  if (room.phase === "lobby") {
    return (
      <main className="min-h-screen p-6 md:p-10 flex flex-col md:flex-row gap-10 items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl md:text-6xl text-gold text-shadow-board mb-6">
            {pack.name}
          </h1>
          <QRJoin code={code} big />
          <p className="mt-4 text-white/60 text-sm">
            Projector view:{" "}
            <Link href={`/board/${code}`} target="_blank" className="underline text-gold">
              /board/{code}
            </Link>
          </p>
        </div>
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl mb-3">
            Teams ({teams.length}) · Players ({players.length})
          </h2>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {teams.map((team) => (
              <div key={team.id} className="rounded-xl bg-black/30 border border-white/10 p-3">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: team.color }} />
                  {team.name}
                </div>
                <div className="text-white/60 text-sm mt-1">
                  {players.filter((p) => p.team_id === team.id).map((p) => p.name).join(", ") || "—"}
                </div>
              </div>
            ))}
            {teams.length === 0 && <p className="text-white/50">Waiting for teams to join…</p>}
          </div>
          <button
            onClick={() => void hostStartGame(t)}
            disabled={teams.length === 0}
            className="mt-6 w-full rounded-2xl bg-green-500 py-4 font-display text-2xl disabled:opacity-40"
          >
            Start game ▶
          </button>
        </div>
      </main>
    );
  }

  // ---------------- playing ----------------
  if (room.phase === "playing") {
    return (
      <main className="min-h-screen p-3 md:p-6 flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl md:text-2xl text-gold">{pack.name}</h1>
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/board/${code}`} target="_blank" className="underline text-white/60">
                Projector
              </Link>
              <button
                onClick={() => void hostSetPhase(t, "final_wager")}
                className={`rounded-lg px-3 py-1.5 font-semibold ${
                  boardDone(room, pack) ? "bg-gold text-boarddark animate-pulse" : "bg-white/10"
                }`}
              >
                Final Round →
              </button>
            </div>
          </div>
          <Board
            pack={pack}
            room={room}
            onPick={(id, _value, isDD) => void hostOpenClue(t, id, isDD)}
          />
          {room.control_team_id && (
            <p className="mt-2 text-white/50 text-sm">
              In control: {teams.find((x) => x.id === room.control_team_id)?.name ?? "—"}
            </p>
          )}
        </div>
        <aside className="lg:w-80">
          <h2 className="font-display text-xl mb-2">Scores</h2>
          <Leaderboard teams={teams} />
        </aside>

        {room.active_clue_id && (
          <ClueView
            pack={pack}
            room={room}
            teams={teams}
            isHost
            onOpenBuzzer={() => void hostOpenBuzzer(t)}
            onCorrect={(teamId, delta) => {
              void hostAward(t, teamId, delta, true).then(() => hostCloseClue(t));
            }}
            onWrong={(teamId, penalty) => {
              if (room.active_is_dd) {
                void hostAward(t, teamId, -penalty).then(() => hostRevealAnswer(t));
              } else {
                void hostReopenAfterMiss(t, penalty);
              }
            }}
            onReveal={() => void hostRevealAnswer(t)}
            onClose={() => void hostCloseClue(t)}
            onDDSet={(teamId, wager) => void hostSetDDWager(t, teamId, wager)}
          />
        )}
      </main>
    );
  }

  // ---------------- final: wager ----------------
  if (room.phase === "final_wager") {
    return (
      <Center>
        <p className="font-display text-gold text-2xl tracking-widest uppercase">Final Round</p>
        <h1 className="font-display text-4xl md:text-6xl my-6">{pack.final.category}</h1>
        <p className="text-white/70 max-w-lg">
          Teams are entering secret wagers on their phones (0 up to their score).
          When everyone&apos;s locked in, reveal the clue.
        </p>
        <button
          onClick={() => void hostSetPhase(t, "final_clue", 60)}
          className="mt-8 rounded-2xl bg-green-500 px-8 py-4 font-display text-2xl"
        >
          Reveal final clue (60s) →
        </button>
        <BackToBoardButton onClick={() => void hostSetPhase(t, "playing")} />
      </Center>
    );
  }

  // ---------------- final: clue ----------------
  if (room.phase === "final_clue") {
    return (
      <Center>
        <p className="font-display text-gold text-xl tracking-widest uppercase">
          {pack.final.category}
        </p>
        <h1 className="font-display text-3xl md:text-5xl my-6 max-w-4xl">{pack.final.clue}</h1>
        <div className="w-full max-w-xl">
          <Timer openedAt={room.clue_opened_at} seconds={room.timer_seconds} />
        </div>
        <p className="text-white/50 mt-2 text-sm">
          Answer: <span className="text-white/80">{pack.final.answer}</span>
        </p>
        <button
          onClick={() => void hostSetPhase(t, "final_reveal")}
          className="mt-6 rounded-2xl bg-gold text-boarddark px-8 py-4 font-display text-2xl"
        >
          Lock answers & start reveal →
        </button>
      </Center>
    );
  }

  // ---------------- final: reveal ----------------
  if (room.phase === "final_reveal") {
    if (!finals) return <Center>Loading final answers…</Center>;
    const entry = finals[revealIdx];
    const done = revealIdx >= finals.length;

    return (
      <Center>
        <p className="font-display text-gold text-xl tracking-widest uppercase">The moment of truth</p>
        <p className="text-white/60 mt-1 text-sm">
          Correct response: <span className="text-gold">{pack.final.answer}</span>
        </p>
        {!done && entry ? (
          <div className="mt-8 w-full max-w-xl rounded-3xl bg-black/40 border border-white/15 p-8 space-y-4 animate-pop" key={entry.team_id}>
            <div className="flex items-center gap-3 justify-center text-3xl font-bold">
              <span className="h-5 w-5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.team_name}
            </div>
            <p className="text-center text-white/60">
              Score before final: {fmtScore(entry.score)} · Wager:{" "}
              <span className="text-gold font-bold">{fmtScore(entry.wager)}</span>
            </p>
            {answerShown ? (
              <>
                <p className="text-center font-display text-3xl min-h-[3rem]">
                  {entry.answer.trim() || "(no answer)"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      void hostAward(t, entry.team_id, entry.wager);
                      setAnswerShown(false);
                      setRevealIdx((i) => i + 1);
                    }}
                    className="rounded-xl bg-green-500 py-3 font-bold text-lg"
                  >
                    ✓ (+{fmtScore(entry.wager)})
                  </button>
                  <button
                    onClick={() => {
                      void hostAward(t, entry.team_id, -entry.wager);
                      setAnswerShown(false);
                      setRevealIdx((i) => i + 1);
                    }}
                    className="rounded-xl bg-red-500 py-3 font-bold text-lg"
                  >
                    ✗ (−{fmtScore(entry.wager)})
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setAnswerShown(true)}
                className="w-full rounded-xl bg-gold text-boarddark py-3 font-display text-xl"
              >
                Reveal their answer 👀
              </button>
            )}
            <p className="text-center text-white/40 text-xs">
              Team {revealIdx + 1} of {finals.length}
            </p>
          </div>
        ) : (
          <button
            onClick={() => void hostSetPhase(t, "results")}
            className="mt-8 rounded-2xl bg-green-500 px-8 py-4 font-display text-2xl animate-pulseglow"
          >
            🏆 Show final results!
          </button>
        )}
        <div className="mt-8 w-full max-w-xl">
          <Leaderboard teams={teams} />
        </div>
      </Center>
    );
  }

  // ---------------- results ----------------
  const winner = [...teams].sort((a, b) => b.score - a.score)[0];
  return (
    <Center>
      <Confetti />
      <p className="font-display text-2xl text-gold tracking-widest uppercase">Champions</p>
      {winner && (
        <h1 className="font-display text-5xl md:text-7xl my-4 animate-pop" style={{ color: winner.color }}>
          {winner.name} 🏆
        </h1>
      )}
      <div className="w-full max-w-xl mt-6">
        <Leaderboard teams={teams} big />
      </div>
      <button
        onClick={() => {
          if (confirm("Reset scores and return everyone to the lobby?")) void hostResetGame(t);
        }}
        className="mt-8 rounded-xl bg-white/10 px-6 py-3"
      >
        Play again (same teams) ↺
      </button>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {children}
    </main>
  );
}

function BackToBoardButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-4 text-white/50 underline text-sm">
      ← back to the board
    </button>
  );
}
