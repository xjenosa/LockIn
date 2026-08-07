"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AnswerPeek from "@/components/AnswerPeek";
import Board from "@/components/Board";
import ClueView from "@/components/ClueView";
import Confetti from "@/components/Confetti";
import Leaderboard from "@/components/Leaderboard";
import QRJoin from "@/components/QRJoin";
import Timer from "@/components/Timer";
import { getPack } from "@/content/packs";
import type { Pack } from "@/content/types";
import {
  hostAward,
  hostCloseClue,
  hostDeleteRoom,
  hostGetFinals,
  hostGetScoreLog,
  hostMovePlayer,
  hostOpenBuzzer,
  hostOpenClue,
  hostRemovePlayer,
  hostReopenAfterMiss,
  hostRevealAnswer,
  hostSetControl,
  hostSetDDWager,
  hostSetPhase,
  hostStartGame,
  hostUndoEvent,
  hostUpdateTeam,
} from "@/lib/api";
import {
  fmtScore,
  boardDone,
  getCategoryName,
  lockedCategoryIdx,
  parseClueId,
  TEAM_COLORS,
} from "@/lib/game";
import { getHostToken } from "@/lib/identity";
import type { FinalEntry, Player, ScoreEvent, ScoreReason, Team } from "@/lib/types";
import { useRoom } from "@/lib/useRoom";

// Human-readable clue tag ("Ancient Rome 600") stamped into score_events
// labels at award time, because undo rows rendered later from bare ids and
// deltas are unreadable. Labels can also hold the answer: host-eyes only.
const clueTitle = (pack: Pack, id: string | null) =>
  id ? `${getCategoryName(pack, id)} ${parseClueId(id)?.value ?? "?"}` : "";

export default function HostGame() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();
  const { room, teams, players, notFound } = useRoom(code);
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);

  // Final reveal state
  const [finals, setFinals] = useState<FinalEntry[] | null>(null);
  const [revealIdx, setRevealIdx] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);

  const [log, setLog] = useState<ScoreEvent[]>([]);
  const [editRoster, setEditRoster] = useState(false);

  useEffect(() => {
    setToken(getHostToken(code));
    setTokenChecked(true);
  }, [code]);

  const refreshLog = useCallback(() => {
    if (token) void hostGetScoreLog(token).then(setLog);
  }, [token]);

  // score_events is host-token-gated AND deliberately excluded from the
  // realtime publication (rows can carry answers), so no push ever arrives.
  // Re-pull the log whenever anything it reflects changes: any team's score,
  // the phase, or the revealed count.
  const scoreKey = teams.map((x) => `${x.id}:${x.score}`).join("|");
  const phase = room?.phase;
  const revealedCount = room?.revealed_clue_ids.length ?? 0;
  useEffect(() => {
    if (!token || !phase || phase === "lobby") return;
    void hostGetScoreLog(token).then(setLog);
  }, [token, scoreKey, phase, revealedCount]);

  useEffect(() => {
    if (room?.phase === "final_reveal" && token && finals === null) {
      void hostGetFinals(token).then((rows) => {
        // Reveal order: lowest pre-wager score first, so the leader's fate
        // resolves last. Fetched once per entry into final_reveal.
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
        <Link href="/host" className="underline text-signal mt-4 inline-block">
          Create a game
        </Link>
      </Center>
    );

  const t = token;

  // ---------------- lobby ----------------
  if (room.phase === "lobby") {
    return (
      <main className="min-h-dvh p-6 md:p-10 flex flex-col md:flex-row gap-10 items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl md:text-6xl mb-6">
            {pack.name}
          </h1>
          <QRJoin code={code} big />
          <p className="mt-4 text-white/60 text-sm">
            Projector view:{" "}
            <Link href={`/board/${code}`} target="_blank" className="underline text-signal">
              /board/{code}
            </Link>
          </p>
        </div>
        <div className="w-full max-w-md">
          <div className="flex items-end justify-between mb-3">
            <h2 className="font-display text-2xl">
              Teams ({teams.length}) · Players ({players.length})
            </h2>
            {teams.length > 0 && (
              <button
                onClick={() => setEditRoster((v) => !v)}
                className="text-white/50 underline text-sm"
              >
                {editRoster ? "Done editing" : "Fix teams ✏️"}
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {teams.map((team) => (
              <LobbyTeamCard
                key={team.id}
                token={t}
                team={team}
                teams={teams}
                members={players.filter((p) => p.team_id === team.id)}
                editing={editRoster}
              />
            ))}
            {teams.length === 0 && <p className="text-white/50">Waiting for teams to join…</p>}
          </div>
          <button
            onClick={() => void hostStartGame(t)}
            disabled={teams.length === 0}
            className="mt-6 w-full rounded-2xl bg-signal text-ink py-4 font-display text-2xl disabled:opacity-40"
          >
            Start game ▶
          </button>
        </div>
      </main>
    );
  }

  // ---------------- playing ----------------
  if (room.phase === "playing") {
    // "Next up" preview of the rotation ring. Derive it from control_team_id
    // rather than pick_index: a pre-migration room has an empty ring until the
    // first close_clue back-fills it, and control_team_id is what everything
    // else reads. The prune+append below MUST mirror _advance_control in
    // supabase/functions.sql (teams ordered by created_at) or this label names
    // the wrong team the moment someone joins mid-game.
    const stored = room.pick_order ?? [];
    const ring = [
      ...stored.filter((id) => teams.some((x) => x.id === id)),
      ...teams.filter((x) => !stored.includes(x.id)).map((x) => x.id),
    ];
    const nextPickId = ring.length
      ? ring[(ring.indexOf(room.control_team_id ?? "") + 1) % ring.length]
      : null;
    const controlTeam = teams.find((x) => x.id === room.control_team_id) ?? null;
    const nextTeam = teams.find((x) => x.id === nextPickId) ?? null;

    return (
      <main className="min-h-dvh p-3 md:p-6 flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl md:text-2xl text-white/90">{pack.name}</h1>
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/board/${code}`} target="_blank" className="underline text-white/60">
                Projector
              </Link>
              <button
                onClick={() => void hostSetPhase(t, "final_wager")}
                className={`rounded-lg px-3 py-1.5 font-semibold ${
                  boardDone(room, pack) ? "bg-flare text-ink animate-pulse" : "bg-white/10"
                }`}
              >
                Last Call →
              </button>
            </div>
          </div>
          {/* Must render even with no control team: these chips are the only
              hostSetControl UI in the app, and a pre-migration room has nobody
              holding the pick until the host seeds the ring here. */}
          {teams.length > 0 && (
            <div
              className="mb-3 rounded-2xl border-2 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
              style={
                controlTeam
                  ? { borderColor: controlTeam.color, backgroundColor: `${controlTeam.color}1f` }
                  : { borderColor: "rgba(255,255,255,0.2)" }
              }
            >
              <span
                className="font-display text-xl md:text-2xl"
                style={controlTeam ? { color: controlTeam.color } : undefined}
              >
                {controlTeam
                  ? `🎤 ${controlTeam.name} picks next`
                  : "🎤 Nobody has the pick. Tap a team"}
              </span>
              {controlTeam && nextTeam && nextTeam.id !== controlTeam.id && (
                <button
                  onClick={() => void hostSetControl(t, nextTeam.id)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold"
                >
                  Skip turn → {nextTeam.name}
                </button>
              )}
              <div className="flex flex-wrap gap-1.5 ml-auto">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => void hostSetControl(t, team.id)}
                    title={`Give the pick to ${team.name}`}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                      team.id === controlTeam?.id ? "border-white/70" : "border-white/15 opacity-60"
                    }`}
                    style={{ backgroundColor: `${team.color}33` }}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Board
            pack={pack}
            room={room}
            lockedCatIdx={lockedCategoryIdx(room, pack)}
            onPick={(id, _value, isDD) => void hostOpenClue(t, id, isDD)}
          />
        </div>
        <aside className="lg:w-80 space-y-4">
          <div>
            <h2 className="font-display text-xl mb-2">Scores</h2>
            <Leaderboard teams={teams} highlightTeamId={room.control_team_id} />
          </div>
          <ScoreHistory
            pack={pack}
            log={log}
            onUndo={(id) => void hostUndoEvent(t, id).then(refreshLog)}
          />
        </aside>

        {room.active_clue_id && (
          <ClueView
            pack={pack}
            room={room}
            teams={teams}
            isHost
            onOpenBuzzer={() => void hostOpenBuzzer(t)}
            // Each adjudication refreshes the log directly instead of waiting
            // for the score-change effect: the realtime round trip leaves a
            // stale top row under the host's undo ✕ for up to 5s, and a
            // 0-point Wildcard moves no score at all, so the effect would
            // never fire for it.
            onCorrect={(teamId, delta) => {
              const dd = room.active_is_dd;
              void hostAward(
                t,
                teamId,
                delta,
                dd ? "dd_correct" : "correct",
                room.active_clue_id ?? undefined,
                `${dd ? "Wildcard ✓" : "Correct"}: ${clueTitle(pack, room.active_clue_id)}`
              )
                .then(() => hostCloseClue(t))
                .then(refreshLog);
            }}
            onWrong={(teamId, penalty) => {
              if (room.active_is_dd) {
                void hostAward(
                  t,
                  teamId,
                  -penalty,
                  "dd_wrong",
                  room.active_clue_id ?? undefined,
                  `Wildcard ✗: ${clueTitle(pack, room.active_clue_id)}`
                )
                  .then(() => hostRevealAnswer(t))
                  .then(refreshLog);
              } else {
                void hostReopenAfterMiss(t, penalty).then(refreshLog); // logs its own 'miss' event
              }
            }}
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
        <p className="font-display text-flare glow-flare text-2xl tracking-widest uppercase">Last Call</p>
        <h1 className="font-display text-4xl md:text-6xl my-6">{pack.final.category}</h1>
        <p className="text-white/70 max-w-lg">
          Teams are entering secret wagers on their phones (0 up to their score).
          When everyone&apos;s locked in, reveal the clue.
        </p>
        <button
          onClick={() => void hostSetPhase(t, "final_clue", 60)}
          className="mt-8 rounded-2xl bg-signal text-ink px-8 py-4 font-display text-2xl"
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
        <p className="font-display text-flare text-xl tracking-widest uppercase">
          {pack.final.category}
        </p>
        <h1 className="font-display text-3xl md:text-5xl my-6 max-w-4xl">{pack.final.clue}</h1>
        <div className="w-full max-w-xl">
          <Timer openedAt={room.clue_opened_at} seconds={room.timer_seconds} />
        </div>
        {/* Every team is looking at this screen for a full 60 seconds. */}
        <AnswerPeek text={pack.final.answer} className="mt-4" />
        <button
          onClick={() => void hostSetPhase(t, "final_reveal")}
          className="mt-6 rounded-2xl bg-flare text-ink px-8 py-4 font-display text-2xl"
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
        <p className="font-display text-flare text-xl tracking-widest uppercase">The moment of truth</p>
        <AnswerPeek text={pack.final.answer} className="mt-3" />
        {!done && entry ? (
          <div className="mt-8 w-full max-w-xl rounded-3xl bg-white/5 border border-white/15 p-8 space-y-4 animate-pop" key={entry.team_id}>
            <div className="flex items-center gap-3 justify-center text-3xl font-bold">
              <span className="h-5 w-5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.team_name}
            </div>
            <p className="text-center text-white/60">
              Before Last Call: {fmtScore(entry.score)} · Wager:{" "}
              <span className="text-flare font-bold">{fmtScore(entry.wager)}</span>
            </p>
            {answerShown ? (
              <>
                <p className="text-center font-display text-3xl min-h-[3rem]">
                  {entry.answer.trim() || "(no answer)"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      void hostAward(t, entry.team_id, entry.wager, "final", undefined, "Last Call ✓")
                        .then(refreshLog);
                      setAnswerShown(false);
                      setRevealIdx((i) => i + 1);
                    }}
                    className="rounded-xl bg-win text-ink py-3 font-bold text-lg"
                  >
                    ✓ (+{fmtScore(entry.wager)})
                  </button>
                  <button
                    onClick={() => {
                      void hostAward(t, entry.team_id, -entry.wager, "final", undefined, "Last Call ✗")
                        .then(refreshLog);
                      setAnswerShown(false);
                      setRevealIdx((i) => i + 1);
                    }}
                    className="rounded-xl bg-loss py-3 font-bold text-lg"
                  >
                    ✗ (−{fmtScore(entry.wager)})
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setAnswerShown(true)}
                className="w-full rounded-xl bg-signal text-ink py-3 font-display text-xl"
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
            className="mt-8 rounded-2xl bg-signal text-ink px-8 py-4 font-display text-2xl animate-pulseglow"
          >
            🏆 Show final results!
          </button>
        )}
        {revealIdx > 0 && (
          // Companion to the undo panel: host_undo_event only reverses the
          // score, it cannot re-open the reveal card. This steps back to the
          // card so a mis-tapped ✓/✗ can actually be re-judged.
          <button
            onClick={() => {
              setAnswerShown(false);
              setRevealIdx((i) => Math.max(0, i - 1));
            }}
            className="mt-4 text-white/50 underline text-sm"
          >
            ← previous team
          </button>
        )}
        <div className="mt-8 w-full max-w-xl">
          <Leaderboard teams={teams} />
        </div>
        {/* Undo access during the reveal: the game's biggest score swings are
            judged here and each card vanishes the instant it's tapped. */}
        <div className="mt-8 w-full max-w-xl text-left">
          <ScoreHistory
            pack={pack}
            log={log}
            onUndo={(id) => void hostUndoEvent(t, id).then(refreshLog)}
          />
        </div>
      </Center>
    );
  }

  // ---------------- results ----------------
  const winner = [...teams].sort((a, b) => b.score - a.score)[0];
  return (
    <Center>
      <Confetti />
      <p className="font-display text-2xl text-signal tracking-widest uppercase">Champions</p>
      {winner && (
        <h1 className="font-display text-5xl md:text-7xl my-4 animate-pop" style={{ color: winner.color }}>
          {winner.name} 🏆
        </h1>
      )}
      <div className="w-full max-w-xl mt-6">
        <Leaderboard teams={teams} big />
      </div>
      {/* Last chance to undo a misjudgement: host_reset_game and
          host_delete_room both wipe score_events. */}
      <div className="mt-8 w-full max-w-xl text-left">
        <ScoreHistory
          pack={pack}
          log={log}
          onUndo={(id) => void hostUndoEvent(t, id).then(refreshLog)}
        />
      </div>
      {/* Leaving IS the cleanup: host_delete_room drops the room and every
          child row (cascade), so finished games never pile up in the DB. The
          confirm() is the only guard on an irreversible action. */}
      <button
        onClick={() => {
          if (
            !confirm(
              "Finish and delete this game?\n\nScores and teams are erased and room " +
                `${code} stops working. Players will need a new code to play again.`
            )
          )
            return;
          void hostDeleteRoom(t)
            .catch(() => {})
            .then(() => router.push("/"));
        }}
        className="mt-10 rounded-2xl bg-white/10 border border-white/20 px-8 py-4 font-display text-2xl"
      >
        🏠 Finish & back to home
      </button>
      <p className="text-white/40 text-xs mt-3 max-w-sm">
        Deletes this game from the database. Starting another round gives a new
        room code, so everyone re-scans the QR.
      </p>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
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

// Display labels for score_events.reason keys. The KEYS are a DB CHECK
// constraint (schema.sql); rebrand labels only ever change the values here.
// Used as fallback when an event has no label (host_reopen_after_miss logs
// its miss without one).
const REASON_TEXT: Record<ScoreReason, string> = {
  correct: "Correct",
  miss: "Wrong answer",
  dd_correct: "Wildcard ✓",
  dd_wrong: "Wildcard ✗",
  final: "Last Call",
  manual: "Manual adjustment",
};

// Host-only panel: labels can hold the correct answer, so this must never be
// rendered on the projector or a phone. The ✕ calls host_undo_event, the
// recovery path for a wrong ✓/✗ (e.g. accepting "aluminium" for Au).
function ScoreHistory({
  pack,
  log,
  onUndo,
}: {
  pack: Pack;
  log: ScoreEvent[];
  onUndo: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-xl mb-2">Score history</h2>
      <div className="max-h-72 overflow-y-auto rounded-xl bg-white/[0.04] border border-white/10 p-2 space-y-1">
        {log.map((ev) => (
          <div
            key={ev.id}
            className={`rounded-lg px-2 py-1.5 ${
              ev.reversed ? "opacity-40 line-through" : "bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ev.color }}
              />
              <span className="flex-1 truncate text-sm font-semibold">{ev.team_name}</span>
              <span
                className={`font-display shrink-0 ${ev.delta < 0 ? "text-loss" : "text-signal"}`}
              >
                {ev.delta > 0 ? "+" : ""}
                {fmtScore(ev.delta)}
              </span>
              {!ev.reversed && (
                <button
                  onClick={() => onUndo(ev.id)}
                  title="Undo this"
                  className="shrink-0 px-1 text-white/40 hover:text-loss"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="pl-4 truncate text-white/45 text-xs">
              {ev.label ??
                `${REASON_TEXT[ev.reason] ?? ev.reason}${
                  ev.clue_id ? `: ${clueTitle(pack, ev.clue_id)}` : ""
                }`}
            </p>
          </div>
        ))}
        {log.length === 0 && (
          <p className="text-white/40 text-sm text-center py-3">Nothing scored yet.</p>
        )}
      </div>
    </div>
  );
}

// Lobby repair tool: rename/recolor a team, move or kick a player. Kept
// behind the "Fix teams" toggle so it never competes with Start game. Team
// deletion is not offered; the server garbage-collects a team when its last
// player leaves it (lobby phase only).
function LobbyTeamCard({
  token,
  team,
  teams,
  members,
  editing,
}: {
  token: string;
  team: Team;
  teams: Team[];
  members: Player[];
  editing: boolean;
}) {
  const [name, setName] = useState(team.name);
  const [err, setErr] = useState<string | null>(null);

  const rename = () => {
    const v = name.trim();
    if (!v || v === team.name) return setName(team.name);
    setErr(null);
    void hostUpdateTeam(token, team.id, v).catch((e) => {
      setErr(e instanceof Error && e.message === "TEAM_NAME_TAKEN" ? "Name taken." : "Rename failed.");
      setName(team.name);
    });
  };

  if (!editing) {
    return (
      <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
        <div className="flex items-center gap-2 font-semibold">
          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: team.color }} />
          {team.name}
        </div>
        <div className="text-white/60 text-sm mt-1">
          {members.map((p) => p.name).join(", ") || "None yet"}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          maxLength={28}
          className="flex-1 min-w-0 rounded-lg bg-white/10 border border-white/20 px-2 py-1 font-semibold"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TEAM_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => void hostUpdateTeam(token, team.id, undefined, c)}
            className={`h-6 w-6 rounded-full border-2 ${
              c === team.color ? "border-white" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
            aria-label={`color ${c}`}
          />
        ))}
      </div>
      {err && <p className="text-loss text-xs">{err}</p>}
      {members.map((p) => (
        <div key={p.id} className="flex items-center gap-2 text-sm">
          <span className="flex-1 truncate text-white/80">{p.name}</span>
          <select
            value={team.id}
            onChange={(e) => void hostMovePlayer(token, p.id, e.target.value)}
            className="rounded-lg bg-white/10 border border-white/20 px-1.5 py-1 text-xs max-w-[8rem]"
          >
            {teams.map((x) => (
              <option key={x.id} value={x.id} className="text-black">
                {x.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void hostRemovePlayer(token, p.id)}
            className="px-1 text-white/40 hover:text-loss"
            aria-label={`remove ${p.name}`}
          >
            ✕
          </button>
        </div>
      ))}
      {members.length === 0 && <p className="text-white/40 text-sm">No players yet.</p>}
    </div>
  );
}
