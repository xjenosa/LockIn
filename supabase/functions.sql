-- Buzzer Jeopardy — RPC functions. Run AFTER schema.sql.
-- All functions are SECURITY DEFINER (they bypass RLS); host functions verify
-- host_token against room_hosts before mutating anything.

-- =========================== helpers =======================================

create or replace function _room_by_host(p_host_token uuid)
returns rooms
language plpgsql security definer set search_path = public as $$
declare v_room rooms%rowtype;
begin
  select r.* into v_room
    from rooms r join room_hosts h on h.room_id = r.id
   where h.host_token = p_host_token
   for update of r;
  if not found then raise exception 'invalid host token'; end if;
  return v_room;
end $$;

-- =========================== anyone ========================================

create or replace function create_room(p_pack_id text)
returns table (code text, host_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_room_id uuid;
  v_token uuid;
begin
  -- 4-char code from an unambiguous alphabet; retry on collision
  loop
    v_code := (
      select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                               (floor(random() * 31) + 1)::int, 1), '')
      from generate_series(1, 4)
    );
    begin
      insert into rooms (code, pack_id) values (v_code, p_pack_id)
      returning id into v_room_id;
      exit;
    exception when unique_violation then
      -- loop and try another code
    end;
  end loop;

  insert into room_hosts (room_id) values (v_room_id)
  returning room_hosts.host_token into v_token;

  return query select v_code, v_token;
end $$;

-- =========================== players =======================================

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

-- The critical one: atomic first-to-buzz. The FOR UPDATE row lock serializes
-- simultaneous buzzes; the first transaction through wins, the rest see the
-- winner already set and lose. Server receipt order — client clocks never matter.
create or replace function claim_buzz(p_code text, p_player_id uuid, p_clue_id text)
returns table (won boolean, team_id uuid, team_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_room  rooms%rowtype;
  v_team  teams%rowtype;
  v_pname text;
begin
  select * into v_room from rooms where rooms.code = p_code for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;

  select t.* into v_team
    from players pl join teams t on t.id = pl.team_id
   where pl.id = p_player_id and pl.room_id = v_room.id;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;

  select pl.name into v_pname from players pl where pl.id = p_player_id;

  if v_room.buzzer_open
     and v_room.active_clue_id = p_clue_id
     and v_room.buzzed_team_id is null
     and not (v_team.id = any(v_room.locked_out_team_ids)) then
    update rooms
       set buzzed_team_id = v_team.id,
           buzzed_player_name = v_pname
     where id = v_room.id;
    insert into buzzes (room_id, clue_id, team_id, player_name)
    values (v_room.id, p_clue_id, v_team.id, v_pname);
    return query select true, v_team.id, v_team.name;
  else
    return query select false, v_team.id, v_team.name;
  end if;
end $$;

-- Wager during final_wager; answer during final_wager/final_clue. Upserts the
-- caller's TEAM row, so any teammate can edit until the host locks finals.
create or replace function submit_final(p_player_id uuid, p_wager int default null, p_answer text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms%rowtype;
  v_team teams%rowtype;
begin
  select r.* into v_room from players pl join rooms r on r.id = pl.room_id where pl.id = p_player_id;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select t.* into v_team from players pl join teams t on t.id = pl.team_id where pl.id = p_player_id;
  if not found then raise exception 'NO_TEAM'; end if;

  if v_room.finals_locked then raise exception 'FINALS_LOCKED'; end if;
  if v_room.phase not in ('final_wager', 'final_clue') then raise exception 'WRONG_PHASE'; end if;

  insert into final_submissions (team_id, room_id) values (v_team.id, v_room.id)
  on conflict (team_id) do nothing;

  if p_wager is not null and v_room.phase = 'final_wager' then
    update final_submissions
       set wager = greatest(0, least(p_wager, greatest(v_team.score, 0))),
           updated_at = now()
     where final_submissions.team_id = v_team.id;
  end if;

  if p_answer is not null then
    update final_submissions
       set answer = p_answer, updated_at = now()
     where final_submissions.team_id = v_team.id;
  end if;
end $$;

-- Lets a reloading phone re-read its own team's secret submission (only its own).
create or replace function get_my_final(p_player_id uuid)
returns table (wager int, answer text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select fs.wager, fs.answer
      from players pl
      join final_submissions fs on fs.team_id = pl.team_id
     where pl.id = p_player_id;
end $$;

-- =========================== host ==========================================

create or replace function host_start_game(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update rooms set phase = 'playing' where id = v_room.id;
end $$;

create or replace function host_open_clue(
  p_host_token uuid,
  p_clue_id text,
  p_is_dd boolean default false,
  p_timer int default 12
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update rooms set
    active_clue_id = p_clue_id,
    active_is_dd = p_is_dd,
    dd_team_id = case when p_is_dd then coalesce(control_team_id, dd_team_id) else null end,
    dd_wager = null,
    buzzer_open = false,          -- host opens the buzzer separately, after reading aloud
    buzzed_team_id = null,
    buzzed_player_name = null,
    locked_out_team_ids = '{}',
    answer_revealed = false,
    clue_opened_at = case when p_is_dd then null else now() end,
    timer_seconds = p_timer
  where id = v_room.id;
end $$;

create or replace function host_open_buzzer(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  if v_room.active_clue_id is null or v_room.active_is_dd then return; end if;
  update rooms set
    buzzer_open = true,
    buzzed_team_id = null,
    buzzed_player_name = null,
    clue_opened_at = now()        -- timer starts when the buzzer opens
  where id = v_room.id;
end $$;

-- Daily Double: host picks the wagering team + amount, which also reveals the clue.
create or replace function host_set_dd_wager(p_host_token uuid, p_team_id uuid, p_wager int)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update rooms set
    dd_team_id = p_team_id,
    dd_wager = greatest(0, p_wager),
    clue_opened_at = now()
  where id = v_room.id;
end $$;

-- Wrong answer: penalize + lock out the buzzed team, reopen for steals.
create or replace function host_reopen_after_miss(p_host_token uuid, p_penalty int)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  if v_room.buzzed_team_id is null then return; end if;
  update teams set score = score - p_penalty where id = v_room.buzzed_team_id;
  update rooms set
    locked_out_team_ids = array_append(locked_out_team_ids, v_room.buzzed_team_id),
    buzzed_team_id = null,
    buzzed_player_name = null,
    buzzer_open = true,
    clue_opened_at = now()        -- fresh timer for the steal
  where id = v_room.id;
end $$;

create or replace function host_award(
  p_host_token uuid,
  p_team_id uuid,
  p_delta int,
  p_take_control boolean default false
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update teams set score = score + p_delta
   where id = p_team_id and room_id = v_room.id;
  if p_take_control then
    update rooms set control_team_id = p_team_id where id = v_room.id;
  end if;
end $$;

create or replace function host_reveal_answer(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update rooms set answer_revealed = true, buzzer_open = false where id = v_room.id;
end $$;

create or replace function host_close_clue(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update rooms set
    revealed_clue_ids = case
      when active_clue_id is not null and not (active_clue_id = any(revealed_clue_ids))
        then array_append(revealed_clue_ids, active_clue_id)
      else revealed_clue_ids end,
    active_clue_id = null,
    active_is_dd = false,
    dd_team_id = null,
    dd_wager = null,
    buzzer_open = false,
    buzzed_team_id = null,
    buzzed_player_name = null,
    locked_out_team_ids = '{}',
    answer_revealed = false,
    clue_opened_at = null
  where id = v_room.id;
end $$;

-- Phase transitions. Entering final_clue starts the answer timer; entering
-- final_reveal locks all submissions.
create or replace function host_set_phase(p_host_token uuid, p_phase text, p_timer int default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  if p_phase not in ('lobby','playing','final_wager','final_clue','final_reveal','results') then
    raise exception 'BAD_PHASE';
  end if;
  update rooms set
    phase = p_phase,
    clue_opened_at = case when p_phase in ('final_clue') then now() else null end,
    timer_seconds = coalesce(p_timer, timer_seconds),
    finals_locked = case when p_phase in ('final_reveal','results') then true else finals_locked end,
    active_clue_id = null,
    buzzer_open = false,
    buzzed_team_id = null,
    buzzed_player_name = null,
    answer_revealed = false
  where id = v_room.id;
end $$;

create or replace function host_lock_finals(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update rooms set finals_locked = true where id = v_room.id;
end $$;

-- Host-only read of every team's secret wager + answer, for the reveal.
create or replace function host_get_finals(p_host_token uuid)
returns table (team_id uuid, team_name text, color text, score int, wager int, answer text)
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  return query
    select t.id, t.name, t.color, t.score,
           coalesce(fs.wager, 0), coalesce(fs.answer, '')
      from teams t
      left join final_submissions fs on fs.team_id = t.id
     where t.room_id = v_room.id
     order by t.score desc, t.created_at;
end $$;

-- Play again: zero scores, clear the board + finals, back to lobby.
-- Optionally switch to a different question pack.
create or replace function host_reset_game(p_host_token uuid, p_pack_id text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update teams set score = 0 where room_id = v_room.id;
  delete from final_submissions where room_id = v_room.id;
  update rooms set
    pack_id = coalesce(p_pack_id, pack_id),
    phase = 'lobby',
    active_clue_id = null,
    active_is_dd = false,
    dd_team_id = null,
    dd_wager = null,
    buzzer_open = false,
    buzzed_team_id = null,
    buzzed_player_name = null,
    locked_out_team_ids = '{}',
    revealed_clue_ids = '{}',
    control_team_id = null,
    answer_revealed = false,
    finals_locked = false,
    clue_opened_at = null
  where id = v_room.id;
end $$;
