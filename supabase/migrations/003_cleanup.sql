-- Buzzer — migration 003: stop games accumulating forever.
-- Idempotent; safe to re-run. Run after 001 and 002.
--
-- Nothing ever deleted a room, so every game ever created still had a row, plus
-- its teams, players, buzzes and score_events. All the child tables already
-- declare "on delete cascade" on room_id, so deleting the room row is enough to
-- take everything with it.

-- The host leaving the results screen ends the game and wipes it.
create or replace function host_delete_room(p_host_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_room rooms;
begin
  v_room := _room_by_host(p_host_token);
  delete from rooms where id = v_room.id;   -- cascades to every child table
end $$;

-- Safety net for games the host never closed out — a laptop shut mid-round, a
-- browser tab lost. Not exposed to clients: it takes no secret, so anyone could
-- call it and wipe live games.
create or replace function delete_stale_rooms(p_days int default 7)
returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  delete from rooms where created_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function delete_stale_rooms(int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- ONE-TIME CLEANUP of everything already in the database.
-- At the time of writing that was 19 rooms: 17 created by the test harness plus
-- two finished games. Comment this out if a game is live while you run this.
-- ---------------------------------------------------------------------------
delete from rooms;

-- ---------------------------------------------------------------------------
-- OPTIONAL: automate the safety net. Requires the pg_cron extension, which
-- Supabase offers under Database -> Extensions. Skip this whole block if you
-- would rather not enable it — host_delete_room already handles the normal path.
-- ---------------------------------------------------------------------------
-- create extension if not exists pg_cron;
-- select cron.schedule('buzzer-purge-stale', '0 4 * * *', $cron$ select delete_stale_rooms(7); $cron$);
