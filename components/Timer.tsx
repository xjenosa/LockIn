"use client";

import { useEffect, useState } from "react";

// Countdown derived from a shared DB timestamp so every screen agrees.
// Purely visual — the host adjudicates; nothing auto-fires at zero.
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
    const end = new Date(openedAt).getTime() + seconds * 1000;
    const tick = () => setRemaining(Math.max(0, (end - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [openedAt, seconds]);

  if (remaining === null) return null;

  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;
  const urgent = remaining <= 3;

  return (
    <div className={`w-full ${className}`}>
      <div className="h-3 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${
            urgent ? "bg-red-500" : "bg-gold"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className={`mt-1 text-center font-display text-2xl ${
          remaining === 0 ? "text-red-400" : urgent ? "text-red-300" : "text-gold"
        }`}
      >
        {remaining === 0 ? "TIME!" : Math.ceil(remaining)}
      </div>
    </div>
  );
}
