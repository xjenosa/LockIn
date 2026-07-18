export type Phase =
  | "lobby"
  | "playing"
  | "final_wager"
  | "final_clue"
  | "final_reveal"
  | "results";

export type Room = {
  id: string;
  code: string;
  pack_id: string;
  phase: Phase;
  active_clue_id: string | null;
  buzzer_open: boolean;
  buzzed_team_id: string | null;
  buzzed_player_name: string | null;
  clue_opened_at: string | null;
  timer_seconds: number;
  locked_out_team_ids: string[];
  revealed_clue_ids: string[];
  control_team_id: string | null;
  active_is_dd: boolean;
  dd_team_id: string | null;
  dd_wager: number | null;
  answer_revealed: boolean;
  finals_locked: boolean;
};

export type Team = {
  id: string;
  room_id: string;
  name: string;
  color: string;
  score: number;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  team_id: string | null;
  name: string;
};

export type FinalEntry = {
  team_id: string;
  team_name: string;
  color: string;
  score: number;
  wager: number;
  answer: string;
};
