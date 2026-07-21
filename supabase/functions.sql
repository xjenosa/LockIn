-- Buzzer — RPC functions. Run AFTER schema.sql.
-- All functions are SECURITY DEFINER (they bypass RLS); host functions verify
-- host_token against room_hosts before mutating anything.
--
-- IDEMPOTENT: everything here is "create or replace", so re-running this over a
-- live database just updates the functions in place. No migrations folder.

-- Postgres keys functions on argument types, so re-running this file over an
-- older install would leave the pre-migration signatures behind and make
-- PostgREST calls ambiguous.
drop function if exists host_open_buzzer(uuid);
drop function if exists host_reopen_after_miss(uuid, int);
drop function if exists host_award(uuid, uuid, int, boolean);

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

-- Rotating turn order: prune ring entries whose team was deleted, append teams
-- that joined mid-game, then hand control to the next one. The current position
-- is re-derived from control_team_id because pruning shifts pick_index.
create or replace function _advance_control(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid[];
  v_idx   int;
  v_cur   uuid;
begin
  select r.pick_order, r.pick_index, r.control_team_id
    into v_order, v_idx, v_cur
    from rooms r where r.id = p_room_id;

  select coalesce(array_agg(u.x order by u.ord), '{}'::uuid[]) into v_order
    from unnest(v_order) with ordinality as u(x, ord)
   where exists (select 1 from teams t where t.id = u.x and t.room_id = p_room_id);

  v_order := v_order || coalesce((
    select array_agg(t.id order by t.created_at)
      from teams t
     where t.room_id = p_room_id and not (t.id = any(v_order))
  ), '{}'::uuid[]);

  if cardinality(v_order) = 0 then                  -- no teams yet: nothing to rotate
    update rooms set pick_order = v_order, pick_index = 0, control_team_id = null
     where id = p_room_id;
    return;
  end if;

  v_idx := greatest(coalesce(array_position(v_order, v_cur) - 1, v_idx), 0);
  v_idx := (v_idx + 1) % cardinality(v_order);

  update rooms set
    pick_order = v_order,
    pick_index = v_idx,
    control_team_id = v_order[v_idx + 1]            -- Postgres arrays are 1-indexed
  where id = p_room_id;
end $$;

-- A team is being deleted: pull it out of the ring so control never lands on a
-- ghost. pick_index may go stale, which _advance_control re-derives.
create or replace function _forget_team(p_room_id uuid, p_team_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update rooms set
    pick_order = array_remove(pick_order, p_team_id),
    control_team_id = nullif(control_team_id, p_team_id)
  where id = p_room_id;
end $$;

-- These two take a room id rather than a secret, so they must not be reachable
-- from the anon key or anyone could skip another table's turn.
revoke all on function _advance_control(uuid) from public, anon, authenticated;
revoke all on function _forget_team(uuid, uuid) from public, anon, authenticated;

-- =========================== anyone ========================================

-- Every countdown (buzzer_arms_at, clue_opened_at) is a Postgres timestamp, but
-- it is drawn against the device clock. One reading of ours lets each client
-- correct for its own skew — without it a phone a few seconds slow arms its
-- buzzer late and loses every race it should have won.
create or replace function server_now()
returns timestamptz
language sql stable security definer set search_path = public as $$
  select now()
$$;

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

  -- Late joiners mid-game are fine, but from the Final Round on a new team can
  -- only appear with $0 and no wager. host_reset_game reopens the room.
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

-- Fix a typo'd name or defect to another team after joining. Same friendly
-- error codes as join_room so the client keeps one mapping table.
create or replace function update_player(
  p_player_id uuid,
  p_name text default null,
  p_team_id uuid default null,
  p_new_team_name text default null,
  p_new_team_color text default null
)
returns table (player_id uuid, team_id uuid, team_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_room     rooms%rowtype;
  v_player   players%rowtype;
  v_team     teams%rowtype;
  v_old_team uuid;
  v_name     text;
begin
  select pl.* into v_player from players pl where pl.id = p_player_id;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  select r.* into v_room from rooms r where r.id = v_player.room_id;
  v_old_team := v_player.team_id;

  if p_team_id is not null then
    select t.* into v_team from teams t where t.id = p_team_id and t.room_id = v_room.id;
    if not found then raise exception 'TEAM_NOT_FOUND'; end if;

  elsif p_new_team_name is not null and trim(p_new_team_name) <> '' then
    v_name := trim(p_new_team_name);
    select t.* into v_team from teams t where t.room_id = v_room.id and t.name = v_name;
    if found then
      -- Re-submitting your own team's name is an edit, not a collision.
      if v_old_team is distinct from v_team.id then raise exception 'TEAM_NAME_TAKEN'; end if;
      if p_new_team_color is not null then
        update teams t set color = p_new_team_color where t.id = v_team.id;
      end if;
    else
      begin
        insert into teams (room_id, name, color)
        values (v_room.id, v_name, coalesce(p_new_team_color, '#facc15'))
        returning * into v_team;
      exception when unique_violation then          -- two phones picked it at once
        raise exception 'TEAM_NAME_TAKEN';
      end;
    end if;

  else                                              -- name-only edit: keep the current team
    select t.* into v_team from teams t where t.id = v_old_team;
    if not found then raise exception 'TEAM_NAME_REQUIRED'; end if;
  end if;

  -- Team membership is the only ACL on final_submissions and on the steal
  -- lockout, so switching teams freezes while a clue is live and for the whole
  -- Final Round; renaming yourself stays available in every phase. Mid-game
  -- moves go through host_move_player, which is token-guarded.
  -- NOTE: this function still authenticates by p_player_id alone, exactly as
  -- claim_buzz and submit_final do, and player ids are publicly readable. A
  -- per-player secret token would close that properly — it needs client+schema
  -- changes, so it is left as the repo owner's call.
  if v_team.id is distinct from v_old_team then
    if v_room.phase in ('final_wager','final_clue','final_reveal','results') then
      raise exception 'TEAM_LOCKED_IN_FINAL';
    end if;
    if v_room.active_clue_id is not null then
      raise exception 'TEAM_LOCKED_MID_CLUE';
    end if;
  end if;

  update players pl set
    name = case when p_name is not null and trim(p_name) <> '' then trim(p_name) else pl.name end,
    team_id = v_team.id
  where pl.id = p_player_id;

  -- An abandoned team is clutter in the lobby, but mid-game it still holds a
  -- score and a slot in the rotation — deleting it there would corrupt both.
  if v_old_team is not null and v_old_team <> v_team.id
     and v_room.phase = 'lobby'
     and not exists (select 1 from players pl where pl.team_id = v_old_team) then
    perform _forget_team(v_room.id, v_old_team);
    delete from teams t where t.id = v_old_team;
  end if;

  return query select v_player.id, v_team.id, v_team.name;
end $$;

-- The critical one: atomic first-to-buzz. The FOR UPDATE row lock serializes
-- simultaneous buzzes; the first transaction through wins, the rest see the
-- winner already set and lose. Server receipt order — client clocks never matter.
-- buzzer_arms_at is the anti-spam gate: taps before it are silently dropped,
-- and it lives here because a client-side check is just a dare.
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
     and now() >= coalesce(v_room.buzzer_arms_at, '-infinity'::timestamptz)
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

-- Seed the rotation ring in join order; first team picks first.
create or replace function host_start_game(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room  rooms;
  v_order uuid[];
begin
  v_room := _room_by_host(p_host_token);
  select coalesce(array_agg(t.id order by t.created_at), '{}'::uuid[]) into v_order
    from teams t where t.room_id = v_room.id;
  update rooms set
    phase = 'playing',
    pick_order = v_order,
    pick_index = 0,
    control_team_id = case when cardinality(v_order) > 0 then v_order[1] else null end
  where id = v_room.id;
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
    buzzer_arms_at = null,
    locked_out_team_ids = '{}',
    answer_revealed = false,
    clue_opened_at = case when p_is_dd then null else now() end,
    timer_seconds = p_timer
  where id = v_room.id;
end $$;

-- clue_opened_at is pushed to the arming moment so the answer clock only starts
-- once the buzzer is actually live — the countdown is not part of their time.
create or replace function host_open_buzzer(p_host_token uuid, p_arm_seconds int default 3)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms;
  v_arms timestamptz;
begin
  v_room := _room_by_host(p_host_token);
  if v_room.active_clue_id is null or v_room.active_is_dd then return; end if;
  v_arms := now() + make_interval(secs => greatest(coalesce(p_arm_seconds, 3), 0));
  update rooms set
    buzzer_open = true,
    buzzed_team_id = null,
    buzzed_player_name = null,
    buzzer_arms_at = v_arms,
    clue_opened_at = v_arms
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

-- Wrong answer: penalize + lock out the buzzed team, reopen for steals. The
-- penalty is logged so host_undo_event can put it back and lift the lockout.
create or replace function host_reopen_after_miss(
  p_host_token uuid,
  p_penalty int,
  p_arm_seconds int default 3
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms;
  v_arms timestamptz;
begin
  v_room := _room_by_host(p_host_token);
  if v_room.buzzed_team_id is null then return; end if;
  v_arms := now() + make_interval(secs => greatest(coalesce(p_arm_seconds, 3), 0));

  update teams set score = score - p_penalty where id = v_room.buzzed_team_id;
  insert into score_events (room_id, team_id, delta, reason, clue_id)
  values (v_room.id, v_room.buzzed_team_id, -p_penalty, 'miss', v_room.active_clue_id);

  update rooms set
    locked_out_team_ids = array_append(locked_out_team_ids, v_room.buzzed_team_id),
    buzzed_team_id = null,
    buzzed_player_name = null,
    buzzer_open = true,
    buzzer_arms_at = v_arms,
    answer_revealed = false,      -- the host may have revealed it to explain the miss;
                                  -- the steal cannot run with it up on the projector
    clue_opened_at = v_arms       -- fresh timer for the steal, starting when it arms
  where id = v_room.id;
end $$;

-- Every score change is logged. Control no longer follows the points — the
-- rotation in host_close_clue owns that now.
create or replace function host_award(
  p_host_token uuid,
  p_team_id uuid,
  p_delta int,
  p_reason text default 'manual',
  p_clue_id text default null,
  p_label text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update teams set score = score + p_delta
   where id = p_team_id and room_id = v_room.id;
  if not found then return; end if;
  insert into score_events (room_id, team_id, delta, reason, clue_id, label)
  values (v_room.id, p_team_id, p_delta, coalesce(p_reason, 'manual'), p_clue_id, p_label);
end $$;

-- Take back a misjudgement. Idempotent: the reversed flag makes a second call
-- (double tap, retried request) a no-op.
create or replace function host_undo_event(p_host_token uuid, p_event_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms;
  v_ev   score_events%rowtype;
begin
  v_room := _room_by_host(p_host_token);
  select e.* into v_ev from score_events e
   where e.id = p_event_id and e.room_id = v_room.id and not e.reversed
   for update;
  if not found then return; end if;

  update teams set score = score - v_ev.delta where id = v_ev.team_id;
  update score_events e set reversed = true where e.id = v_ev.id;

  -- Undoing a miss must also lift the steal lockout, or the team stays frozen
  -- out of a clue they were never actually wrong on — but only if the miss is on
  -- the clue that is live now. Re-judging an old one must not unlock the current.
  if v_ev.reason = 'miss' and v_ev.clue_id is not distinct from v_room.active_clue_id then
    update rooms set locked_out_team_ids = array_remove(locked_out_team_ids, v_ev.team_id)
     where id = v_room.id;
  end if;
end $$;

create or replace function host_get_score_log(p_host_token uuid)
returns table (
  id uuid, team_id uuid, team_name text, color text, delta int,
  reason text, clue_id text, label text, reversed boolean, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  return query
    select e.id, e.team_id, t.name, t.color, e.delta,
           e.reason, e.clue_id, e.label, e.reversed, e.created_at
      from score_events e
      join teams t on t.id = e.team_id
     where e.room_id = v_room.id
     order by e.created_at desc
     limit 40;
end $$;

create or replace function host_reveal_answer(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  update rooms set answer_revealed = true, buzzer_open = false where id = v_room.id;
end $$;

-- Turn passes team-to-team here, not to whoever answered — one sharp player
-- sweeping a whole category is what killed the last playtest.
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
    buzzer_arms_at = null,
    locked_out_team_ids = '{}',
    answer_revealed = false,
    clue_opened_at = null
  where id = v_room.id;
  -- Only rotate if this call is the one that actually closed a clue. A double
  -- tap on "← Back to board" would otherwise skip a team's turn entirely.
  if v_room.active_clue_id is not null then
    perform _advance_control(v_room.id);
  end if;
end $$;

-- Host override: hand the pick to a specific team (skipped turn, late joiner,
-- "you go again"). The ring resumes from there.
create or replace function host_set_control(p_host_token uuid, p_team_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room  rooms;
  v_order uuid[];
begin
  v_room := _room_by_host(p_host_token);
  if not exists (select 1 from teams t where t.id = p_team_id and t.room_id = v_room.id) then
    raise exception 'TEAM_NOT_FOUND';
  end if;
  v_order := v_room.pick_order;
  if not (p_team_id = any(v_order)) then v_order := v_order || p_team_id; end if;
  update rooms set
    pick_order = v_order,
    pick_index = array_position(v_order, p_team_id) - 1,
    control_team_id = p_team_id
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
    buzzer_arms_at = null,
    answer_revealed = false
  where id = v_room.id;
end $$;

create or replace function host_update_team(
  p_host_token uuid,
  p_team_id uuid,
  p_name text default null,
  p_color text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  if not exists (select 1 from teams t where t.id = p_team_id and t.room_id = v_room.id) then
    raise exception 'TEAM_NOT_FOUND';
  end if;
  begin
    update teams t set
      name = case when p_name is not null and trim(p_name) <> '' then trim(p_name) else t.name end,
      color = coalesce(p_color, t.color)
    where t.id = p_team_id;
  exception when unique_violation then
    raise exception 'TEAM_NAME_TAKEN';
  end;
end $$;

create or replace function host_move_player(p_host_token uuid, p_player_id uuid, p_team_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms;
  v_old  uuid;
begin
  v_room := _room_by_host(p_host_token);
  select pl.team_id into v_old from players pl
   where pl.id = p_player_id and pl.room_id = v_room.id;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if not exists (select 1 from teams t where t.id = p_team_id and t.room_id = v_room.id) then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  update players pl set team_id = p_team_id where pl.id = p_player_id;

  if v_old is not null and v_old <> p_team_id and v_room.phase = 'lobby'
     and not exists (select 1 from players pl where pl.team_id = v_old) then
    perform _forget_team(v_room.id, v_old);
    delete from teams t where t.id = v_old;
  end if;
end $$;

create or replace function host_remove_player(p_host_token uuid, p_player_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms;
  v_old  uuid;
begin
  v_room := _room_by_host(p_host_token);
  select pl.team_id into v_old from players pl
   where pl.id = p_player_id and pl.room_id = v_room.id;
  if not found then return; end if;             -- already gone; kicking twice is fine

  delete from players pl where pl.id = p_player_id;

  if v_old is not null and v_room.phase = 'lobby'
     and not exists (select 1 from players pl where pl.team_id = v_old) then
    perform _forget_team(v_room.id, v_old);
    delete from teams t where t.id = v_old;
  end if;
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
  delete from score_events where room_id = v_room.id;
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
    buzzer_arms_at = null,
    locked_out_team_ids = '{}',
    revealed_clue_ids = '{}',
    control_team_id = null,
    pick_order = '{}',
    pick_index = 0,
    answer_revealed = false,
    finals_locked = false,
    clue_opened_at = null
  where id = v_room.id;
end $$;

-- The host leaving the results screen ends the game and wipes it. Child tables
-- all cascade on room_id, so deleting the room row removes everything.
create or replace function host_delete_room(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  delete from rooms where id = v_room.id;
end $$;

-- Safety net for games the host never closed out. Hours, not days: a party game
-- is over in about two, so "older than a few hours" is the useful granularity
-- and days is too coarse to clear the same evening's mess.
-- Not exposed to clients: it takes no secret, so anyone could call it and wipe
-- live games. Returns the number of rooms deleted.
drop function if exists delete_stale_rooms(int);   -- renamed p_days -> p_hours

create or replace function delete_stale_rooms(p_hours int default 24)
returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  delete from rooms where created_at < now() - make_interval(hours => greatest(p_hours, 1));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function delete_stale_rooms(int) from public, anon, authenticated;
