"use client";

import { useEffect, useState } from "react";
import type { Pack } from "@/content/types";
import { fmtScore, getCategoryName, getClue, parseClueId } from "@/lib/game";
import { serverNow } from "@/lib/serverClock";
import type { Room, Team } from "@/lib/types";
import AnswerPeek from "./AnswerPeek";
import Timer from "./Timer";

// Full-screen clue overlay. Two consumers: the host page (isHost adds the
// adjudication bar) and the projector page (read-only). All state is the
// shared rooms row; this component holds no game state of its own, only the
// wager form inputs.
export default function ClueView({
  pack,
  room,
  teams,
  isHost,
  onOpenBuzzer,
  onCorrect,
  onWrong,
  onReveal,
  onClose,
  onDDSet,
}: {
  pack: Pack;
  room: Room;
  teams: Team[];
  isHost: boolean;
  onOpenBuzzer?: () => void;
  onCorrect?: (teamId: string, delta: number) => void;
  onWrong?: (teamId: string, penalty: number) => void;
  onReveal?: () => void;
  onClose?: () => void;
  onDDSet?: (teamId: string, wager: number) => void;
}) {
  const clueIdStr = room.active_clue_id!;
  const clue = getClue(pack, clueIdStr);
  const value = parseClueId(clueIdStr)?.value ?? 0;
  const category = getCategoryName(pack, clueIdStr);
  const buzzedTeam = teams.find((t) => t.id === room.buzzed_team_id) ?? null;
  const ddTeam = teams.find((t) => t.id === room.dd_team_id) ?? null;
  const ddWagerStage = room.active_is_dd && room.clue_opened_at === null;

  const [wagerInput, setWagerInput] = useState("");
  const [ddTeamInput, setDDTeamInput] = useState(room.dd_team_id ?? "");

  // Arming countdown, same construction as Buzzer.tsx: armLeft derived at
  // render (effect state would show one stale frame), measured against
  // serverNow() (lib/serverClock.ts), effect only pulses re-renders and
  // settles at 0 so React can bail out. Keeps host, projector and phones
  // counting to the same instant.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!room.buzzer_arms_at) return;
    const at = Date.parse(room.buzzer_arms_at);
    const id = setInterval(() => setTick(Math.max(0, at - serverNow())), 100);
    return () => clearInterval(id);
  }, [room.buzzer_arms_at]);
  const armLeft = room.buzzer_arms_at
    ? Math.max(0, (Date.parse(room.buzzer_arms_at) - serverNow()) / 1000)
    : 0;
  const arming = room.buzzer_open && armLeft > 0;

  if (!clue) return null;

  // ---------- Wildcard wager splash ----------
  if (ddWagerStage) {
    const chosen = teams.find((t) => t.id === (ddTeamInput || room.dd_team_id));
    // House rule: a Wildcard team may always wager up to 1000 even on a lower
    // (or negative) score. Mirrors nothing server-side; host_set_dd_wager only
    // clamps below at 0.
    const maxWager = chosen ? Math.max(chosen.score, 1000) : 1000;
    // wagerNum stays null unless the input is a real number: a blank box used
    // to parse to 0 and silently lock a wager of nothing, letting the team
    // play the square for free.
    const wagerNum = /^\d+$/.test(wagerInput.trim()) ? parseInt(wagerInput.trim(), 10) : null;
    return (
      <div className="fixed inset-0 bg-stage flex flex-col items-center justify-center p-6 text-center gap-6 z-40">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_-10%,rgba(255,106,61,0.16),transparent_55%)]" />
        <p className="relative font-display uppercase text-flare/80 text-xl md:text-2xl tracking-widest">
          {category}
        </p>
        <h1 className="relative font-display text-6xl md:text-8xl text-flare glow-flare animate-pop">
          WILDCARD!
        </h1>
        {isHost ? (
          <div className="relative bg-white/5 ring-1 ring-white/15 rounded-2xl p-6 w-full max-w-md space-y-4 text-left">
            <label className="block">
              <span className="text-white/70 text-sm">Wagering team</span>
              <select
                value={ddTeamInput || room.dd_team_id || ""}
                onChange={(e) => setDDTeamInput(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-white"
              >
                <option value="" disabled>
                  Pick a team…
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="text-black">
                    {t.name} ({fmtScore(t.score)})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-white/70 text-sm">
                Wager (max {fmtScore(maxWager)} points; ask them out loud!)
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={wagerInput}
                onChange={(e) => setWagerInput(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-white text-xl"
                placeholder="e.g. 800"
              />
            </label>
            <button
              onClick={() => {
                const teamId = ddTeamInput || room.dd_team_id;
                if (teamId && wagerNum !== null) onDDSet?.(teamId, Math.min(wagerNum, maxWager));
              }}
              disabled={!(ddTeamInput || room.dd_team_id) || wagerNum === null}
              className="w-full rounded-xl bg-flare text-ink font-display text-2xl py-3 disabled:opacity-40"
            >
              {wagerNum === null ? "Enter a wager…" : `Lock ${fmtScore(Math.min(wagerNum, maxWager))} & reveal clue`}
            </button>
          </div>
        ) : (
          <p className="relative text-white/80 text-xl md:text-3xl">
            {ddTeam ? `${ddTeam.name} is wagering…` : "A team is wagering…"}
          </p>
        )}
      </div>
    );
  }

  // ---------- Normal clue / revealed Wildcard ----------
  return (
    <div className="fixed inset-0 bg-stage flex flex-col z-40">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_-10%,rgba(37,230,196,0.10),transparent_55%)]" />
      <div className="relative flex items-center justify-between px-4 md:px-8 py-3">
        <span className="font-display uppercase tracking-widest text-white/60 text-lg md:text-2xl">
          {category}
        </span>
        <span className={`font-display text-lg md:text-2xl ${room.active_is_dd ? "text-flare" : "text-signal"}`}>
          {room.active_is_dd && room.dd_wager != null
            ? `${ddTeam?.name ?? "Wildcard"} wagers ${fmtScore(room.dd_wager)}`
            : value}
        </span>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 md:px-16 text-center gap-6">
        {clue.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clue.image} alt="" className="max-h-[30vh] rounded-xl" />
        )}
        <p className="font-display leading-snug text-2xl md:text-5xl lg:text-6xl max-w-6xl">
          {clue.clue}
        </p>

        {room.answer_revealed && (
          <p className="text-signal glow-signal font-display text-3xl md:text-5xl animate-pop">
            {clue.answer}
          </p>
        )}

        {!room.active_is_dd && (
          <>
            {buzzedTeam ? (
              <div
                className="animate-pop rounded-2xl bg-white text-ink px-8 py-4 md:px-10 md:py-5 text-3xl md:text-5xl font-display border-[6px]"
                style={{ borderColor: buzzedTeam.color }}
              >
                🚨 {buzzedTeam.name}
                {room.buzzed_player_name ? `: ${room.buzzed_player_name}` : ""}
              </div>
            ) : arming ? (
              // key remounts the block each second so each digit replays the
              // pop animation.
              <div key={Math.ceil(armLeft)} className="animate-pop flex flex-col items-center">
                <p className="font-display uppercase tracking-[0.3em] text-white/60 text-lg md:text-2xl">
                  Get ready
                </p>
                <p className="font-display text-signal glow-signal text-7xl md:text-9xl leading-none">
                  {Math.ceil(armLeft)}
                </p>
              </div>
            ) : room.buzzer_open ? (
              <p className="font-display text-signal glow-signal text-2xl md:text-4xl animate-pulse">
                BUZZERS LIVE
              </p>
            ) : !room.answer_revealed ? (
              <p className="text-white/40 text-lg md:text-2xl">Buzzers locked</p>
            ) : null}
          </>
        )}
      </div>

      <div className="relative px-6 md:px-24 pb-3">
        {(room.buzzer_open || room.active_is_dd) && !room.answer_revealed && (
          <Timer openedAt={room.clue_opened_at} seconds={room.timer_seconds} />
        )}
      </div>

      {isHost && (
        <div className="relative bg-black/60 backdrop-blur border-t border-white/10 px-4 py-3 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {/* Placed left of ✓/✗ so the host reads the answer, then judges.
              Doubles as the reveal control: hold = private peek, tap = show
              the room (see AnswerPeek's header for why that split is load-
              bearing on a projected screen). */}
          <AnswerPeek text={clue.answer} revealed={room.answer_revealed} onReveal={onReveal} />
          {room.active_is_dd ? (
            <>
              <button
                onClick={() => ddTeam && onCorrect?.(ddTeam.id, room.dd_wager ?? 0)}
                className="rounded-xl bg-win text-ink px-5 py-3 font-bold text-lg"
              >
                ✓ Correct (+{fmtScore(room.dd_wager ?? 0)})
              </button>
              <button
                onClick={() => ddTeam && onWrong?.(ddTeam.id, room.dd_wager ?? 0)}
                className="rounded-xl bg-loss px-5 py-3 font-bold text-lg"
              >
                ✗ Wrong (−{fmtScore(room.dd_wager ?? 0)})
              </button>
            </>
          ) : buzzedTeam ? (
            <>
              <button
                onClick={() => onCorrect?.(buzzedTeam.id, value)}
                className="rounded-xl bg-win text-ink px-5 py-3 font-bold text-lg"
              >
                ✓ Correct (+{value})
              </button>
              <button
                onClick={() => onWrong?.(buzzedTeam.id, value)}
                className="rounded-xl bg-loss px-5 py-3 font-bold text-lg"
              >
                ✗ Wrong (−{value}, others can steal)
              </button>
            </>
          ) : (
            !room.buzzer_open &&
            !room.answer_revealed && (
              <button
                onClick={onOpenBuzzer}
                className="rounded-xl bg-signal text-ink px-6 py-3 font-display text-xl animate-pulseglow"
              >
                🚨 Open buzzers
              </button>
            )
          )}
          <button
            onClick={onClose}
            className="rounded-xl bg-white/10 border border-white/15 px-5 py-3 font-bold"
          >
            ← Back to board
          </button>
        </div>
      )}
    </div>
  );
}
