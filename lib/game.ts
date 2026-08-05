import type { Pack, Clue } from "@/content/types";
import type { Room } from "./types";

// Row values of every board column, ascending. Packs must use exactly these
// (content/types.ts invariant); clue ids are derived from them.
export const VALUES = [200, 400, 600, 800, 1000];

// Clue id format "c{catIdx}-{value}" is a persistence contract: rooms stores
// these strings (active_clue_id, revealed_clue_ids, score_events.clue_id), so
// changing the format orphans the board state of any live game.
export const clueId = (catIdx: number, value: number) => `c${catIdx}-${value}`;

export function parseClueId(id: string): { catIdx: number; value: number } | null {
  const m = /^c(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  return { catIdx: Number(m[1]), value: Number(m[2]) };
}

export function getClue(pack: Pack, id: string): Clue | null {
  const parsed = parseClueId(id);
  if (!parsed) return null;
  const cat = pack.categories[parsed.catIdx];
  return cat?.clues.find((c) => c.value === parsed.value) ?? null;
}

export function getCategoryName(pack: Pack, id: string): string {
  const parsed = parseClueId(id);
  return parsed ? pack.categories[parsed.catIdx]?.name ?? "" : "";
}

// House rule: the column just played cannot be picked again immediately.
// Returns null when nothing is locked, including the endgame case where every
// remaining clue sits in that column (locking it there would deadlock the
// board). Purely a UI constraint; the server does not enforce it.
export function lockedCategoryIdx(room: Room, pack: Pack): number | null {
  const last = room.revealed_clue_ids[room.revealed_clue_ids.length - 1];
  const idx = last ? parseClueId(last)?.catIdx ?? null : null;
  if (idx === null) return null;
  const openElsewhere = pack.categories.some(
    (cat, i) =>
      i !== idx && cat.clues.some((c) => !room.revealed_clue_ids.includes(clueId(i, c.value)))
  );
  return openElsewhere ? idx : null;
}

export function boardDone(room: Room, pack: Pack): boolean {
  const total = pack.categories.reduce((n, c) => n + c.clues.length, 0);
  return room.revealed_clue_ids.length >= total;
}

// Scores are bare points, formatted with thousands separators. Prose copy says
// "points" where a unit helps; the number itself never carries one.
export function fmtScore(n: number): string {
  return n.toLocaleString();
}

// Team identity hues, tuned to read on ink without colliding with the signal
// and flare UI roles (see BRAND.md).
export const TEAM_COLORS = [
  "#FF5C5C", "#FF9E4D", "#FFD166", "#9BE857",
  "#57E0FF", "#5CB2FF", "#B48CFF", "#FF7AC1",
];
