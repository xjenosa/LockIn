-- Buzzer — maintenance. Optional: not needed to set the app up, and safe to run
-- at any time, including during a party. Run it whenever you want to tidy up.
--
-- Games normally clean themselves up: "Finish & back to home" on the results
-- screen calls host_delete_room, which deletes the room and cascades to its
-- teams, players, buzzes and score_events. This file catches what that misses —
-- games abandoned mid-round when a laptop was shut or a tab was lost.

-- Finished games where the host closed the tab instead of using the button.
delete from rooms where phase = 'results';

-- Games nobody has touched in a day. A session lasts about two hours, so this
-- can never catch a live game. Returns how many it removed.
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
-- from Database -> Extensions. The results-screen button already covers games
-- that end normally, so this is belt-and-braces.
-- create extension if not exists pg_cron;
-- select cron.schedule('buzzer-purge-stale', '0 4 * * *', $cron$ select delete_stale_rooms(24); $cron$);
