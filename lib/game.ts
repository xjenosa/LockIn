import type { Pack, Clue } from "@/content/types";
import type { Room } from "./types";

export const VALUES = [200, 400, 600, 800, 1000];

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

export function boardDone(room: Room, pack: Pack): boolean {
  const total = pack.categories.reduce((n, c) => n + c.clues.length, 0);
  return room.revealed_clue_ids.length >= total;
}

export function fmtScore(n: number): string {
  return n < 0 ? `-$${Math.abs(n).toLocaleString()}` : `$${n.toLocaleString()}`;
}

export const TEAM_COLORS = [
  "#f43f5e", "#f97316", "#facc15", "#22c55e",
  "#06b6d4", "#3b82f6", "#a855f7", "#ec4899",
];
