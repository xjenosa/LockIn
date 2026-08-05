-- Blare maintenance. Optional: not part of setup. The statements above the
-- opt-in divider are live and safe to run at ANY time, including during a
-- party (the stale purge cannot touch a game younger than the cutoff).
--
-- Games normally clean themselves up: leaving the results screen calls
-- host_delete_room, which cascades the whole room away. This file catches
-- what that misses: games abandoned mid-round when a laptop was shut or a
-- tab was lost.

-- Finished games where the host closed the tab instead of using the button.
delete from rooms where phase = 'results';

-- Games older than 24h (cutoff is created_at, not last activity; a session
-- lasts about two hours, so this cannot catch a live game).
select delete_stale_rooms(24) as abandoned_rooms_deleted;

-- What's left.
select count(*) as rooms_remaining,
       count(*) filter (where created_at > now() - interval '2 hours') as probably_live
  from rooms;


-- ===========================================================================
-- Everything below is opt-in. Uncomment only if you mean it.
-- ===========================================================================

-- Wipe EVERY game, including one in progress. Only for a full reset.
-- delete from rooms;

-- Run the stale purge automatically at 4am daily. Needs the pg_cron extension
-- from Database -> Extensions. Redundant with normal endings; only worthwhile
-- if abandoned games actually accumulate.
-- create extension if not exists pg_cron;
-- select cron.schedule('blare-purge-stale', '0 4 * * *', $cron$ select delete_stale_rooms(24); $cron$);
