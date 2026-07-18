"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseConfigured } from "@/lib/supabaseClient";

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const join = () => {
    if (code.trim().length >= 3) router.push(`/play/${code.trim().toUpperCase()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 p-6">
      <div className="text-center">
        <h1 className="font-display text-6xl md:text-8xl text-gold text-shadow-board">BUZZER!</h1>
        <p className="mt-2 text-white/70">team buzzer edition</p>
      </div>

      {!supabaseConfigured && (
        <p className="max-w-md text-center text-amber-300 bg-amber-950/50 rounded-xl p-4 text-sm">
          ⚠️ Supabase isn&apos;t configured — set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see README).
        </p>
      )}

      <div className="w-full max-w-sm space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && join()}
          maxLength={6}
          placeholder="ROOM CODE"
          className="w-full rounded-2xl bg-white/10 border border-white/20 p-5 text-center font-display text-3xl tracking-[0.3em] placeholder:tracking-normal placeholder:text-white/30"
        />
        <button
          onClick={join}
          className="w-full rounded-2xl bg-green-500 py-4 font-display text-2xl"
        >
          Join as player 📱
        </button>
      </div>

      <button
        onClick={() => router.push("/host")}
        className="text-white/60 underline underline-offset-4 hover:text-gold"
      >
        I&apos;m the host — create a game →
      </button>
    </main>
  );
}
