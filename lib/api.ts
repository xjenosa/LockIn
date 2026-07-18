import { supabase } from "./supabaseClient";
import type { FinalEntry, Phase } from "./types";

async function rpc<T = void>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// ---- anyone ----
export async function createRoom(packId: string) {
  const rows = await rpc<{ code: string; host_token: string }[]>("create_room", {
    p_pack_id: packId,
  });
  return rows[0];
}

// ---- player ----
export async function joinRoom(opts: {
  code: string;
  playerName: string;
  teamName?: string;
  teamColor?: string;
  existingTeamId?: string;
}) {
  const rows = await rpc<{ player_id: string; team_id: string; team_name: string }[]>(
    "join_room",
    {
      p_code: opts.code,
      p_player_name: opts.playerName,
      p_team_name: opts.teamName ?? null,
      p_team_color: opts.teamColor ?? "#facc15",
      p_existing_team_id: opts.existingTeamId ?? null,
    }
  );
  return rows[0];
}

export async function claimBuzz(code: string, playerId: string, clueId: string) {
  const rows = await rpc<{ won: boolean; team_id: string; team_name: string }[]>(
    "claim_buzz",
    { p_code: code, p_player_id: playerId, p_clue_id: clueId }
  );
  return rows[0];
}

export function submitFinal(playerId: string, wager: number | null, answer: string | null) {
  return rpc("submit_final", { p_player_id: playerId, p_wager: wager, p_answer: answer });
}

export async function getMyFinal(playerId: string) {
  const rows = await rpc<{ wager: number; answer: string }[]>("get_my_final", {
    p_player_id: playerId,
  });
  return rows[0] ?? null;
}

// ---- host ----
export const hostStartGame = (token: string) =>
  rpc("host_start_game", { p_host_token: token });

export const hostOpenClue = (token: string, clueId: string, isDD: boolean, timer = 12) =>
  rpc("host_open_clue", { p_host_token: token, p_clue_id: clueId, p_is_dd: isDD, p_timer: timer });

export const hostOpenBuzzer = (token: string) =>
  rpc("host_open_buzzer", { p_host_token: token });

export const hostSetDDWager = (token: string, teamId: string, wager: number) =>
  rpc("host_set_dd_wager", { p_host_token: token, p_team_id: teamId, p_wager: wager });

export const hostReopenAfterMiss = (token: string, penalty: number) =>
  rpc("host_reopen_after_miss", { p_host_token: token, p_penalty: penalty });

export const hostAward = (token: string, teamId: string, delta: number, takeControl = false) =>
  rpc("host_award", { p_host_token: token, p_team_id: teamId, p_delta: delta, p_take_control: takeControl });

export const hostRevealAnswer = (token: string) =>
  rpc("host_reveal_answer", { p_host_token: token });

export const hostCloseClue = (token: string) =>
  rpc("host_close_clue", { p_host_token: token });

export const hostSetPhase = (token: string, phase: Phase, timer?: number) =>
  rpc("host_set_phase", { p_host_token: token, p_phase: phase, p_timer: timer ?? null });

export const hostLockFinals = (token: string) =>
  rpc("host_lock_finals", { p_host_token: token });

export const hostGetFinals = (token: string) =>
  rpc<FinalEntry[]>("host_get_finals", { p_host_token: token });

export const hostResetGame = (token: string, packId?: string) =>
  rpc("host_reset_game", { p_host_token: token, p_pack_id: packId ?? null });
