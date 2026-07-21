"use client";

import { useEffect, useState } from "react";
import type { Pack } from "@/content/types";
import { fmtScore, getCategoryName, getClue, parseClueId } from "@/lib/game";
import { serverNow } from "@/lib/serverClock";
import type { Room, Team } from "@/lib/types";
import AnswerPeek from "./AnswerPeek";
import Timer from "./Timer";

// Full-screen clue. Used by the host (isHost -> control bar) and the
// projector page (read-only). All state comes from the shared room row.
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

  // Arming window ticks off the shared buzzer_arms_at so every phone, the host
  // and the projector count down to the same instant. Derived during render like
  // the phone's (effect state shows one stale frame), against the DB clock; the
  // effect only pulses a re-render, and settles at 0 so React can bail out.
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

  // ---------- Daily Double wager splash ----------
  if (ddWagerStage) {
    const chosen = teams.find((t) => t.id === (ddTeamInput || room.dd_team_id));
    const maxWager = chosen ? Math.max(chosen.score, 1000) : 1000;
    // A blank box used to parse to 0 and silently lock in a wager of nothing,
    // so the team played the square for free. Require a deliberate number.
    const wagerNum = /^\d+$/.test(wagerInput.trim()) ? parseInt(wagerInput.trim(), 10) : null;
    return (
      <div className="fixed inset-0 bg-board flex flex-col items-center justify-center p-6 text-center gap-6 z-40">
        <p className="font-display uppercase text-gold text-xl md:text-2xl tracking-widest">{category}</p>
        <h1 className="font-display text-5xl md:text-8xl text-gold text-shadow-board animate-pop">
          DAILY DOUBLE!
        </h1>
        {isHost ? (
          <div className="bg-black/40 rounded-2xl p-6 w-full max-w-md space-y-4 text-left">
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
                Wager (max {fmtScore(maxWager)}; ask them out loud!)
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
              className="w-full rounded-xl bg-gold text-boarddark font-display text-2xl py-3 disabled:opacity-40"
            >
              {wagerNum === null ? "Enter a wager…" : `Lock ${fmtScore(Math.min(wagerNum, maxWager))} & reveal clue`}
            </button>
          </div>
        ) : (
          <p className="text-white/80 text-xl md:text-3xl">
            {ddTeam ? `${ddTeam.name} is wagering…` : "A team is wagering…"}
          </p>
        )}
      </div>
    );
  }

  // ---------- Normal clue / revealed DD ----------
  return (
    <div className="fixed inset-0 bg-board flex flex-col z-40">
      <div className="flex items-center justify-between px-4 md:px-8 py-3 text-gold">
        <span className="font-display uppercase tracking-wider text-lg md:text-2xl">{category}</span>
        <span className="font-display text-lg md:text-2xl">
          {room.active_is_dd && room.dd_wager != null
            ? `${ddTeam?.name ?? "DD"} wagers ${fmtScore(room.dd_wager)}`
            : `$${value}`}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-16 text-center gap-6">
        {clue.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clue.image} alt="" className="max-h-[30vh] rounded-xl" />
        )}
        <p className="font-display uppercase text-shadow-board leading-snug text-2xl md:text-5xl lg:text-6xl max-w-6xl">
          {clue.clue}
        </p>

        {room.answer_revealed && (
          <p className="text-gold font-display text-2xl md:text-4xl animate-pop">{clue.answer}</p>
        )}

        {!room.active_is_dd && (
          <>
            {buzzedTeam ? (
              <div
                className="animate-pop rounded-2xl px-8 py-4 text-2xl md:text-4xl font-bold border-4"
                style={{ borderColor: buzzedTeam.color, backgroundColor: "rgba(0,0,0,0.45)" }}
              >
                🔔 {buzzedTeam.name}
                {room.buzzed_player_name ? `: ${room.buzzed_player_name}` : ""}
              </div>
            ) : arming ? (
              // key remounts each second so every number pops on its own.
              <div key={Math.ceil(armLeft)} className="animate-pop flex flex-col items-center">
                <p className="font-display uppercase tracking-widest text-white/70 text-lg md:text-2xl">
                  Get ready…
                </p>
                <p className="font-display text-white text-shadow-board text-6xl md:text-8xl leading-none">
                  {Math.ceil(armLeft)}
                </p>
              </div>
            ) : room.buzzer_open ? (
              <p className="text-green-300 text-xl md:text-3xl animate-pulse">Buzzers open!</p>
            ) : !room.answer_revealed ? (
              <p className="text-white/50 text-lg md:text-2xl">Buzzers locked</p>
            ) : null}
          </>
        )}
      </div>

      <div className="px-6 md:px-24 pb-3">
        {(room.buzzer_open || room.active_is_dd) && !room.answer_revealed && (
          <Timer openedAt={room.clue_opened_at} seconds={room.timer_seconds} />
        )}
      </div>

      {isHost && (
        <div className="bg-black/50 px-4 py-3 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {/* Sits left of ✓/✗: check the answer, then adjudicate. Doubles as the
              reveal button: hold to peek privately, tap to show the room. */}
          <AnswerPeek text={clue.answer} revealed={room.answer_revealed} onReveal={onReveal} />
          {room.active_is_dd ? (
            <>
              <button
                onClick={() => ddTeam && onCorrect?.(ddTeam.id, room.dd_wager ?? 0)}
                className="rounded-xl bg-green-500 px-5 py-3 font-bold text-lg"
              >
                ✓ Correct (+{fmtScore(room.dd_wager ?? 0)})
              </button>
              <button
                onClick={() => ddTeam && onWrong?.(ddTeam.id, room.dd_wager ?? 0)}
                className="rounded-xl bg-red-500 px-5 py-3 font-bold text-lg"
              >
                ✗ Wrong (−{fmtScore(room.dd_wager ?? 0)})
              </button>
            </>
          ) : buzzedTeam ? (
            <>
              <button
                onClick={() => onCorrect?.(buzzedTeam.id, value)}
                className="rounded-xl bg-green-500 px-5 py-3 font-bold text-lg"
              >
                ✓ Correct (+${value})
              </button>
              <button
                onClick={() => onWrong?.(buzzedTeam.id, value)}
                className="rounded-xl bg-red-500 px-5 py-3 font-bold text-lg"
              >
                ✗ Wrong (−${value}, others can steal)
              </button>
            </>
          ) : (
            !room.buzzer_open &&
            !room.answer_revealed && (
              <button
                onClick={onOpenBuzzer}
                className="rounded-xl bg-green-500 px-6 py-3 font-display text-xl animate-pulseglow"
              >
                🔔 Open buzzers
              </button>
            )
          )}
          <button onClick={onClose} className="rounded-xl bg-gold text-boarddark px-5 py-3 font-bold">
            ← Back to board
          </button>
        </div>
      )}
    </div>
  );
}
