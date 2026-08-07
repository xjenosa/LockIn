"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import GridBackdrop from "@/components/GridBackdrop";
import LockMark from "@/components/LockMark";
import Wordmark from "@/components/Wordmark";
import { supabaseConfigured } from "@/lib/supabaseClient";

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const join = () => {
    if (code.trim().length >= 3) router.push(`/play/${code.trim().toUpperCase()}`);
  };

  return (
    <main className="relative isolate min-h-dvh flex flex-col items-center justify-center gap-10 p-6 overflow-hidden">
      {/* One static central teal glow behind the value grid; shows through the
          grid's cleared centre under the hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_50%_42%,rgba(67,226,210,0.16),transparent_62%)]"
      />
      <GridBackdrop values />
      {/* Hero lock: the prominent mark, wordmark stacked under it so both center
          on the page axis (showMark={false} drops the wordmark's inline lock). */}
      <div className="relative flex flex-col items-center gap-5">
        <LockMark className="h-20 w-20 md:h-28 md:w-28 drop-shadow-[0_0_28px_rgba(67,226,210,0.4)] animate-breathe motion-reduce:animate-none" />
        <Wordmark showMark={false} className="text-6xl md:text-8xl" />
      </div>

      {!supabaseConfigured && (
        <p className="relative max-w-md text-center text-flare bg-flare/10 border border-flare/30 rounded-xl p-4 text-sm">
          ⚠️ Supabase isn&apos;t configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see README).
        </p>
      )}

      <div className="relative w-full max-w-sm space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && join()}
          maxLength={6}
          placeholder="ROOM CODE"
          className="w-full rounded-2xl bg-white/5 border border-white/15 focus:border-signal focus:outline-none p-5 text-center font-display text-3xl tracking-[0.3em] placeholder:tracking-normal placeholder:text-white/30"
        />
        <button
          onClick={join}
          className="w-full rounded-2xl bg-signal text-ink py-4 font-display text-2xl"
        >
          Join as player 📱
        </button>
      </div>

      <button
        onClick={() => router.push("/host")}
        className="relative text-white/60 underline underline-offset-4 hover:text-signal"
      >
        I&apos;m the host. Create a game →
      </button>
    </main>
  );
}
