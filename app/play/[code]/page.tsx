"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Buzzer from "@/components/Buzzer";
import Confetti from "@/components/Confetti";
import Leaderboard from "@/components/Leaderboard";
import TeamJoin from "@/components/TeamJoin";
import Timer from "@/components/Timer";
import { getMyFinal, submitFinal, updatePlayer } from "@/lib/api";
import { fmtScore } from "@/lib/game";
import { getPlayerIdentity, setPlayerIdentity, type PlayerIdentity } from "@/lib/identity";
import { useRoom } from "@/lib/useRoom";

export default function Play() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const { room, teams, players, notFound, refetch } = useRoom(code);
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savedTeamId, setSavedTeamId] = useState<string | null>(null);
  const [staleIdentity, setStaleIdentity] = useState(false);

  useEffect(() => {
    setIdentity(getPlayerIdentity(code));
    setReady(true);
  }, [code]);

  const me = useMemo(
    () => (identity ? players.find((p) => p.id === identity.playerId) ?? null : null),
    [players, identity]
  );

  // Team resolution precedence: a just-saved local edit wins until the refetch
  // lands, then the server row wins forever (the host can also move players
  // between teams, so the server must be able to override local memory).
  const myTeam = useMemo(() => {
    const id = savedTeamId ?? me?.team_id ?? identity?.teamId ?? null;
    return id ? teams.find((t) => t.id === id) ?? null : null;
  }, [teams, me, identity, savedTeamId]);

  // Stale-identity detection. Our player row disappears permanently after a
  // host delete/reset, but it also blips missing mid-refetch. Only bounce to
  // the join screen once it STAYS missing (debounced); reacting instantly
  // would make a refetch hiccup re-join and spawn a duplicate player. Longer
  // grace when the roster is empty: that usually means the first fetch has
  // not landed yet.
  useEffect(() => {
    if (!identity || me) {
      setStaleIdentity(false);
      return;
    }
    const t = setTimeout(() => setStaleIdentity(true), players.length ? 1500 : 5000);
    return () => clearTimeout(t);
  }, [identity, me, players.length]);

  if (notFound)
    return (
      <Center>
        <p className="text-2xl">Room {code} not found 🤔</p>
        <p className="text-white/60 mt-2">Double-check the code with your host.</p>
      </Center>
    );
  if (!room || !ready) return <Center>Loading…</Center>;

  if (!identity || staleIdentity) {
    // The lobby closes at Last Call, so show that rather than a join form
    // the server is guaranteed to reject with GAME_CLOSED.
    const closed = ["final_wager", "final_clue", "final_reveal", "results"].includes(room.phase);
    if (closed)
      return (
        <Center>
          <p className="text-3xl">🔒 This game has finished</p>
          <p className="text-white/60 mt-2">
            Joining is closed during Last Call. If your host starts another
            round, this page will let you back in.
          </p>
        </Center>
      );

    // Not joined yet (or stale identity from a previous game on this code)
    return (
      <main className="min-h-dvh p-6 flex flex-col justify-center">
        <h1 className="font-display text-4xl text-center mb-8">
          Join room <span className="text-signal">{code}</span>
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

  if (!myTeam) return <ResolvingTeam onRejoin={() => setIdentity(null)} />;

  const rank = [...teams].sort((a, b) => b.score - a.score).findIndex((t) => t.id === myTeam.id) + 1;

  const applyEdit = (id: PlayerIdentity) => {
    setPlayerIdentity(code, id);
    setIdentity(id);
    setSavedTeamId(id.teamId); // header flips now instead of a realtime roundtrip later
    setEditing(false);
    void refetch().then(() => setSavedTeamId(null));
  };

  // Mirrors update_player's server-side rule: team membership is the only ACL
  // on Last Call submissions and the steal lockout, so switches are refused
  // mid-clue and from final_wager on. Pass nameOnly there so the sheet offers
  // only what the server will accept.
  const teamLocked =
    room.active_clue_id !== null ||
    room.phase === "final_wager" ||
    room.phase === "final_clue" ||
    room.phase === "final_reveal" ||
    room.phase === "results";

  // The edit sheet rides inside `header` because every phase renders header,
  // including FinalPhone which only receives it as a prop.
  const header = (
    <>
      <header className="flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3">
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: myTeam.color }} />
          <span className="flex-1 min-w-0">
            <span className="block font-bold truncate">{myTeam.name}</span>
            <span className="block text-white/50 text-xs truncate">{identity.name}</span>
          </span>
        </button>
        <div className="text-right">
          <p className={`font-display text-2xl ${myTeam.score < 0 ? "text-loss" : "text-signal"}`}>
            {fmtScore(myTeam.score)}
          </p>
          <p className="text-white/50 text-xs">#{rank} of {teams.length}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          aria-label="Change your name or team"
          className="shrink-0 h-10 w-10 rounded-xl border border-white/20 text-lg active:scale-95"
        >
          ✏️
        </button>
      </header>

      {editing && (
        // Scroll-container layout constraint: the overflow element itself must
        // not align its child to end/center, because overflow past the START
        // edge is unscrollable (CSS), which on short/landscape phones cuts off
        // the name field and the ✕. The inner min-h-full wrapper aligns
        // instead, keeping the top edge reachable.
        <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto p-4">
          <div className="min-h-full flex flex-col justify-end sm:justify-center items-center">
            <div className="w-full max-w-md rounded-3xl bg-stage border border-white/15 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">
                  {teamLocked ? "Your name" : "Name & team"}
                </h2>
                <button
                  onClick={() => setEditing(false)}
                  aria-label="Close"
                  className="text-white/50 text-2xl px-2 leading-none"
                >
                  ✕
                </button>
              </div>
              <TeamJoin
                code={code}
                teams={teams}
                initialName={identity.name}
                initialTeamId={myTeam.id}
                submitLabel="Save ✓"
                nameOnly={teamLocked}
                onCancel={() => setEditing(false)}
                onSubmit={(v) =>
                  updatePlayer({
                    playerId: identity.playerId,
                    name: v.name,
                    teamId: v.teamId,
                    newTeamName: v.newTeamName,
                    newTeamColor: v.newTeamColor,
                  })
                }
                onJoined={applyEdit}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ---------------- phases ----------------
  if (room.phase === "lobby") {
    return (
      <main className="min-h-dvh p-4 flex flex-col gap-4">
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
      <main className="min-h-dvh p-4 flex flex-col gap-4">
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
    <main className="min-h-dvh p-4 flex flex-col gap-4">
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

// Last Call on the phone: secret wager (final_wager), then secret typed
// answer (final_clue). One submission row per TEAM, not per player: any
// teammate can overwrite until the host locks finals. Keyed by phase in the
// parent so state resets on the wager -> clue transition.
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

  // Rehydrate this team's submission (reload, or a teammate saved first).
  // get_my_final only ever returns the caller's own team row.
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
      setError(msg === "FINALS_LOCKED" ? "Too late! Answers are locked." : msg);
    }
  };

  return (
    <main className="min-h-dvh p-4 flex flex-col gap-4">
      {header}
      <div className="flex-1 flex flex-col justify-center gap-4 max-w-md w-full mx-auto">
        <h1 className="font-display text-3xl text-flare glow-flare text-center">LAST CALL</h1>
        {phase === "final_wager" ? (
          <>
            <p className="text-center text-white/70">
              Team wager: anything from 0 to {fmtScore(maxWager)} points. One wager per
              team (last save wins).
            </p>
            <input
              type="number"
              inputMode="numeric"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 p-5 text-center font-display text-4xl"
              placeholder="0"
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
              placeholder="Your team's answer…"
              disabled={locked}
            />
          </>
        )}
        <button
          onClick={save}
          disabled={locked}
          className="w-full rounded-2xl bg-signal text-ink py-4 font-display text-2xl disabled:opacity-40"
        >
          {phase === "final_wager" ? "Lock wager 🔒" : "Submit answer 📝"}
        </button>
        {saved && !error && <p className="text-center text-signal">{saved}</p>}
        {error && <p className="text-center text-loss">{error}</p>}
      </div>
    </main>
  );
}

// Shown while identity exists but the team row has not resolved. Normally a
// refetch race that clears in under a second; the escape hatch appears after
// 3s so a truly broken identity can re-join instead of spinning forever.
function ResolvingTeam({ onRejoin }: { onRejoin: () => void }) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStuck(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Center>
      <p>Getting your team…</p>
      {stuck && (
        <button
          onClick={onRejoin}
          className="mt-6 rounded-xl border border-white/25 px-5 py-3 text-white/70"
        >
          Stuck? Rejoin →
        </button>
      )}
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      {children}
    </div>
  );
}
