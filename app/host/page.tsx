"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { packs } from "@/content/packs";
import { createRoom } from "@/lib/api";
import { setHostToken } from "@/lib/identity";

export default function HostCreate() {
  const router = useRouter();
  const [packId, setPackId] = useState(packs[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { code, host_token } = await createRoom(packId);
      setHostToken(code, host_token);
      router.push(`/host/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="font-display text-4xl md:text-6xl text-gold text-shadow-board">HOST A GAME</h1>

      <div className="w-full max-w-lg space-y-3">
        <p className="text-white/70 text-sm">Pick a question pack:</p>
        {packs.map((p) => (
          <button
            key={p.id}
            onClick={() => setPackId(p.id)}
            className={`w-full text-left rounded-2xl border p-4 transition ${
              packId === p.id ? "border-gold bg-gold/10" : "border-white/15 bg-black/20 hover:border-white/40"
            }`}
          >
            <span className="font-display text-xl">{p.name}</span>
            <span className="block text-white/60 text-sm mt-1">{p.description}</span>
          </button>
        ))}
      </div>

      {error && <p className="text-red-300">{error}</p>}

      <button
        onClick={create}
        disabled={busy}
        className="w-full max-w-lg rounded-2xl bg-green-500 py-4 font-display text-2xl disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create room 🎬"}
      </button>
    </main>
  );
}
