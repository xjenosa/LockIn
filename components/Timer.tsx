"use client";

import { useEffect, useState } from "react";
import { serverNow } from "@/lib/serverClock";

// Countdown bar. Derived from the shared DB timestamp (openedAt) so host,
// projector and phones agree on the same zero. Purely visual: nothing
// auto-fires at zero, the host adjudicates by voice.
export default function Timer({
  openedAt,
  seconds,
  className = "",
}: {
  openedAt: string | null;
  seconds: number;
  className?: string;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!openedAt) {
      setRemaining(null);
      return;
    }
    // openedAt sits in the FUTURE while the buzzer arms (host_open_buzzer sets
    // clue_opened_at = buzzer_arms_at); that window belongs to the arming
    // countdown, so render nothing until the clock starts. Timebase is
    // serverNow() (lib/serverClock.ts): raw Date.now() on a slow device keeps
    // the bar hidden for the whole skew after the clue goes live. Clamped both
    // ends so residual skew can never draw past 100% or below 0.
    const start = new Date(openedAt).getTime();
    const end = start + seconds * 1000;
    const tick = () =>
      setRemaining(
        serverNow() < start ? null : Math.min(seconds, Math.max(0, (end - serverNow()) / 1000))
      );
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [openedAt, seconds]);

  if (remaining === null) return null;

  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;
  const urgent = remaining <= 3;

  return (
    <div className={`w-full ${className}`}>
      <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${
            urgent ? "bg-loss" : "bg-signal"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className={`mt-1 text-center font-display text-2xl ${
          urgent ? "text-loss" : "text-signal"
        }`}
      >
        {remaining === 0 ? "TIME!" : Math.ceil(remaining)}
      </div>
    </div>
  );
}
