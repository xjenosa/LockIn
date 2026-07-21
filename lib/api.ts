import { supabase } from "./supabaseClient";
import type { FinalEntry, Phase, ScoreEvent, ScoreReason } from "./types";

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

// Rename and/or switch team after joining. Throws the same TEAM_NAME_TAKEN /
// TEAM_NAME_REQUIRED / TEAM_NOT_FOUND / PLAYER_NOT_FOUND codes as joinRoom.
export async function updatePlayer(opts: {
  playerId: string;
  name?: string;
  teamId?: string;
  newTeamName?: string;
  newTeamColor?: string;
}) {
  const rows = await rpc<{ player_id: string; team_id: string; team_name: string }[]>(
    "update_player",
    {
      p_player_id: opts.playerId,
      p_name: opts.name ?? null,
      p_team_id: opts.teamId ?? null,
      p_new_team_name: opts.newTeamName ?? null,
      p_new_team_color: opts.newTeamColor ?? null,
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

export const hostOpenBuzzer = (token: string, armSeconds = 3) =>
  rpc("host_open_buzzer", { p_host_token: token, p_arm_seconds: armSeconds });

export const hostSetDDWager = (token: string, teamId: string, wager: number) =>
  rpc("host_set_dd_wager", { p_host_token: token, p_team_id: teamId, p_wager: wager });

export const hostReopenAfterMiss = (token: string, penalty: number, armSeconds = 3) =>
  rpc("host_reopen_after_miss", { p_host_token: token, p_penalty: penalty, p_arm_seconds: armSeconds });

export const hostAward = (
  token: string,
  teamId: string,
  delta: number,
  reason: ScoreReason = "manual",
  clueId?: string,
  label?: string
) =>
  rpc("host_award", {
    p_host_token: token,
    p_team_id: teamId,
    p_delta: delta,
    p_reason: reason,
    p_clue_id: clueId ?? null,
    p_label: label ?? null,
  });

export const hostUndoEvent = (token: string, eventId: string) =>
  rpc("host_undo_event", { p_host_token: token, p_event_id: eventId });

export const hostGetScoreLog = (token: string) =>
  rpc<ScoreEvent[]>("host_get_score_log", { p_host_token: token });

export const hostRevealAnswer = (token: string) =>
  rpc("host_reveal_answer", { p_host_token: token });

export const hostCloseClue = (token: string) =>
  rpc("host_close_clue", { p_host_token: token });

export const hostSetControl = (token: string, teamId: string) =>
  rpc("host_set_control", { p_host_token: token, p_team_id: teamId });

export const hostSetPhase = (token: string, phase: Phase, timer?: number) =>
  rpc("host_set_phase", { p_host_token: token, p_phase: phase, p_timer: timer ?? null });

export const hostLockFinals = (token: string) =>
  rpc("host_lock_finals", { p_host_token: token });

export const hostGetFinals = (token: string) =>
  rpc<FinalEntry[]>("host_get_finals", { p_host_token: token });

export const hostUpdateTeam = (token: string, teamId: string, name?: string, color?: string) =>
  rpc("host_update_team", {
    p_host_token: token,
    p_team_id: teamId,
    p_name: name ?? null,
    p_color: color ?? null,
  });

export const hostMovePlayer = (token: string, playerId: string, teamId: string) =>
  rpc("host_move_player", { p_host_token: token, p_player_id: playerId, p_team_id: teamId });

export const hostRemovePlayer = (token: string, playerId: string) =>
  rpc("host_remove_player", { p_host_token: token, p_player_id: playerId });

export const hostResetGame = (token: string, packId?: string) =>
  rpc("host_reset_game", { p_host_token: token, p_pack_id: packId ?? null });

// Ends the game and deletes the room. Every child table cascades on room_id, so
// nothing is left behind. The host token dies with it; this is irreversible.
export const hostDeleteRoom = (token: string) =>
  rpc("host_delete_room", { p_host_token: token });
