"use client";

import type { Pack } from "@/content/types";
import { clueId } from "@/lib/game";
import type { Room } from "@/lib/types";

// The classic grid. Pass onPick to make cells clickable (host); omit for the
// read-only projector view.
export default function Board({
  pack,
  room,
  onPick,
  lockedCatIdx = null,
}: {
  pack: Pack;
  room: Room;
  onPick?: (id: string, value: number, isDD: boolean) => void;
  lockedCatIdx?: number | null;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:gap-2 w-full">
      {pack.categories.map((cat, catIdx) => (
        <div
          key={cat.name}
          className={`bg-board rounded-md flex flex-col items-center justify-center text-center p-1 sm:p-2 min-h-[64px] md:min-h-[88px] ${
            catIdx === lockedCatIdx ? "opacity-40" : ""
          }`}
        >
          <span className="font-display uppercase text-shadow-board leading-tight text-[11px] sm:text-sm md:text-lg lg:text-xl">
            {cat.name}
          </span>
          {catIdx === lockedCatIdx && (
            <span className="text-[9px] sm:text-[10px] text-white/70 mt-0.5">just played</span>
          )}
        </div>
      ))}
      {[0, 1, 2, 3, 4].map((row) =>
        pack.categories.map((cat, catIdx) => {
          const clue = cat.clues[row];
          const id = clueId(catIdx, clue.value);
          const revealed = room.revealed_clue_ids.includes(id);
          const active = room.active_clue_id === id;
          const locked = catIdx === lockedCatIdx;
          const clickable = Boolean(onPick) && !revealed && !locked;
          return (
            <button
              key={id}
              disabled={!clickable}
              onClick={() => onPick?.(id, clue.value, Boolean(clue.dailyDouble))}
              className={`rounded-md min-h-[52px] md:min-h-[80px] flex items-center justify-center font-display text-shadow-board transition
                text-xl sm:text-3xl md:text-4xl
                ${revealed ? "bg-boarddark/60 text-transparent" : "bg-boardcell text-gold"}
                ${active ? "ring-4 ring-gold" : ""}
                ${!revealed && locked ? "opacity-40 cursor-not-allowed" : ""}
                ${clickable ? "hover:brightness-125 hover:scale-[1.02] cursor-pointer" : ""}`}
            >
              {revealed ? "" : `$${clue.value}`}
            </button>
          );
        })
      )}
    </div>
  );
}
