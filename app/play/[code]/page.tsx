"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Buzzer from "@/components/Buzzer";
import Confetti from "@/components/Confetti";
import Leaderboard from "@/components/Leaderboard";
import TeamJoin from "@/components/TeamJoin";
import Timer from "@/components/Timer";
import { getPack } from "@/content/packs";
import { getMyFinal, submitFinal } from "@/lib/api";
import { fmtScore } from "@/lib/game";
import { getPlayerIdentity, setPlayerIdentity, type PlayerIdentity } from "@/lib/identity";
import { useRoom } from "@/lib/useRoom";

export default function Play() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const { room, teams, players, notFound } = useRoom(code);
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIdentity(getPlayerIdentity(code));
    setReady(true);
  }, [code]);

  // If our player row vanished (host reset to a fresh room), re-join.
  const me = useMemo(
    () => (identity ? players.find((p) => p.id === identity.playerId) ?? null : null),
    [players, identity]
  );
  const myTeam = useMemo(
    () => (me?.team_id ? teams.find((t) => t.id === me.team_id) ?? null : null),
    [teams, me]
  );

  if (notFound)
    return (
      <Center>
        <p className="text-2xl">Room {code} not found 🤔</p>
        <p className="text-white/60 mt-2">Double-check the code with your host.</p>
      </Center>
    );
  if (!room || !ready) return <Center>Loading…</Center>;

  if (!identity || (players.length > 0 && !me && identity)) {
    // Not joined yet (or stale identity from a previous game on this code)
    return (
      <main className="min-h-screen p-6 flex flex-col justify-center">
        <h1 className="font-display text-4xl text-gold text-shadow-board text-center mb-8">
          Join room {code}
        </h1>
        <TeamJoin
          code={code}
          teams={teams}
          onJoined={(id) => {
            setPlayerIdentity(code, id);
            setIdentity(id);
          }}
        />
      </main>
    );
  }

  if (!myTeam)
    return (
      <Center>
        <p>Getting your team…</p>
      </Center>
    );

  const rank = [...teams].sort((a, b) => b.score - a.score).findIndex((t) => t.id === myTeam.id) + 1;

  const header = (
    <header className="flex items-center gap-3 rounded-2xl bg-black/30 border border-white/10 p-3">
      <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: myTeam.color }} />
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate">{myTeam.name}</p>
        <p className="text-white/50 text-xs truncate">{identity.name}</p>
      </div>
      <div className="text-right">
        <p className={`font-display text-2xl ${myTeam.score < 0 ? "text-red-400" : "text-gold"}`}>
          {fmtScore(myTeam.score)}
        </p>
        <p className="text-white/50 text-xs">#{rank} of {teams.length}</p>
      </div>
    </header>
  );

  // ---------------- phases ----------------
  if (room.phase === "lobby") {
    return (
      <main className="min-h-screen p-4 flex flex-col gap-4">
        {header}
        <Center>
          <p className="text-3xl">🎉 You&apos;re in!</p>
          <p className="text-white/60 mt-2">Waiting for the host to start…</p>
          <div className="mt-6 w-full max-w-sm">
            <Leaderboard teams={teams} highlightTeamId={myTeam.id} />
          </div>
        </Center>
      </main>
    );
  }

  if (room.phase === "playing") {
    return (
      <main className="h-[100dvh] p-4 flex flex-col gap-4">
        {header}
        <Buzzer room={room} myTeam={myTeam} teams={teams} playerId={identity.playerId} />
      </main>
    );
  }

  if (room.phase === "final_wager" || room.phase === "final_clue") {
    return (
      <FinalPhone
        key={room.phase}
        phase={room.phase}
        playerId={identity.playerId}
        maxWager={Math.max(myTeam.score, 0)}
        header={header}
        openedAt={room.clue_opened_at}
        timerSeconds={room.timer_seconds}
        locked={room.finals_locked}
      />
    );
  }

  if (room.phase === "final_reveal") {
    return (
      <main className="min-h-screen p-4 flex flex-col gap-4">
        {header}
        <Center>
          <p className="text-3xl">👀 Look up!</p>
          <p className="text-white/60 mt-2">The host is revealing final answers…</p>
          <div className="mt-6 w-full max-w-sm">
            <Leaderboard teams={teams} highlightTeamId={myTeam.id} />
          </div>
        </Center>
      </main>
    );
  }

  // results
  const winner = [...teams].sort((a, b) => b.score - a.score)[0];
  const weWon = winner?.id === myTeam.id;
  return (
    <main className="min-h-screen p-4 flex flex-col gap-4">
      {weWon && <Confetti />}
      {header}
      <Center>
        <p className="font-display text-4xl">{weWon ? "🏆 CHAMPIONS!" : "Good game!"}</p>
        <div className="mt-6 w-full max-w-sm">
          <Leaderboard teams={teams} highlightTeamId={myTeam.id} big />
        </div>
      </Center>
    </main>
  );
}

// Final Round on the phone: secret wager, then secret typed answer.
function FinalPhone({
  phase,
  playerId,
  maxWager,
  header,
  openedAt,
  timerSeconds,
  locked,
}: {
  phase: "final_wager" | "final_clue";
  playerId: string;
  maxWager: number;
  header: React.ReactNode;
  openedAt: string | null;
  timerSeconds: number;
  locked: boolean;
}) {
  const [wager, setWager] = useState("");
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore own team's submission on reload / teammate edit.
  useEffect(() => {
    void getMyFinal(playerId).then((f) => {
      if (f) {
        setWager(String(f.wager));
        setAnswer(f.answer);
      }
    });
  }, [playerId, phase]);

  const save = async () => {
    setError(null);
    try {
      if (phase === "final_wager") {
        const w = Math.min(Math.max(parseInt(wager || "0", 10) || 0, 0), maxWager);
        await submitFinal(playerId, w, null);
        setWager(String(w));
        setSaved(`Wager ${fmtScore(w)} locked in ✓`);
      } else {
        await submitFinal(playerId, null, answer);
        setSaved("Answer submitted ✓ (you can still edit)");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      setError(msg === "FINALS_LOCKED" ? "Too late — answers are locked!" : msg);
    }
  };

  return (
    <main className="min-h-screen p-4 flex flex-col gap-4">
      {header}
      <div className="flex-1 flex flex-col justify-center gap-4 max-w-md w-full mx-auto">
        <h1 className="font-display text-3xl text-gold text-center">FINAL ROUND</h1>
        {phase === "final_wager" ? (
          <>
            <p className="text-center text-white/70">
              Team wager — anything from $0 to {fmtScore(maxWager)}. One wager per team
              (last save wins).
            </p>
            <input
              type="number"
              inputMode="numeric"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 p-5 text-center font-display text-4xl"
              placeholder="$0"
              disabled={locked}
            />
          </>
        ) : (
          <>
            <p className="text-center text-white/70">
              Look at the screen for the clue, then type your team&apos;s response:
            </p>
            <Timer openedAt={openedAt} seconds={timerSeconds} />
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              className="w-full rounded-2xl bg-white/10 border border-white/20 p-4 text-xl"
              placeholder="What is…?"
              disabled={locked}
            />
          </>
        )}
        <button
          onClick={save}
          disabled={locked}
          className="w-full rounded-2xl bg-green-500 py-4 font-display text-2xl disabled:opacity-40"
        >
          {phase === "final_wager" ? "Lock wager 🔒" : "Submit answer 📝"}
        </button>
        {saved && !error && <p className="text-center text-green-300">{saved}</p>}
        {error && <p className="text-center text-red-300">{error}</p>}
      </div>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      {children}
    </div>
  );
}
