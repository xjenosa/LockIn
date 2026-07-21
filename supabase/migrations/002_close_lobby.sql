-- Buzzer — migration 002: close the lobby once the game reaches the endgame.
-- Idempotent; safe to re-run. Requires 001_playtest_fixes.sql to have been run.
--
-- Late joiners during 'lobby' and 'playing' are a deliberate feature — someone
-- turning up halfway through can still play. But from the Final Round onward a
-- new team can only ever appear with $0 and no wager, which looks broken to
-- them and clutters the leaderboard during the reveal. Close it there.

create or replace function join_room(
  p_code text,
  p_player_name text,
  p_team_name text default null,
  p_team_color text default '#facc15',
  p_existing_team_id uuid default null
)
returns table (player_id uuid, team_id uuid, team_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms%rowtype;
  v_team teams%rowtype;
  v_player_id uuid;
begin
  select * into v_room from rooms where rooms.code = upper(trim(p_code));
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;

  -- The host can reopen the room to new players with host_reset_game, which
  -- returns the phase to 'lobby'.
  if v_room.phase in ('final_wager', 'final_clue', 'final_reveal', 'results') then
    raise exception 'GAME_CLOSED';
  end if;

  if p_existing_team_id is not null then
    select * into v_team from teams t
     where t.id = p_existing_team_id and t.room_id = v_room.id;
    if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  else
    if p_team_name is null or trim(p_team_name) = '' then
      raise exception 'TEAM_NAME_REQUIRED';
    end if;
    begin
      insert into teams (room_id, name, color)
      values (v_room.id, trim(p_team_name), coalesce(p_team_color, '#facc15'))
      returning * into v_team;
    exception when unique_violation then
      raise exception 'TEAM_NAME_TAKEN';
    end;
  end if;

  insert into players (room_id, team_id, name)
  values (v_room.id, v_team.id, trim(p_player_name))
  returning id into v_player_id;

  return query select v_player_id, v_team.id, v_team.name;
end $$;
