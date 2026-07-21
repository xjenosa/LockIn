-- Buzzer — OPTIONAL maintenance. Not needed for setup; schema.sql + functions.sql
-- are all you need to run the app.
--
-- Finished games normally clean themselves up: "Finish & back to home" on the
-- results screen calls host_delete_room, which deletes the room and cascades to
-- its teams, players, buzzes and score_events. This file is for the leftovers —
-- games abandoned mid-round when a laptop was shut or a tab was lost.

-- ---------------------------------------------------------------------------
-- One-off: wipe every game currently in the database.
-- DANGER: this includes any game in progress. Don't run it during a party.
-- ---------------------------------------------------------------------------
-- delete from rooms;

-- ---------------------------------------------------------------------------
-- One-off: drop only games older than a week, leaving anything recent alone.
-- Safer than the above and usually what you want.
-- ---------------------------------------------------------------------------
-- select delete_stale_rooms(7);

-- ---------------------------------------------------------------------------
-- Automate the weekly purge. Needs the pg_cron extension, which Supabase offers
-- under Database -> Extensions. Entirely optional — the results-screen button
-- already covers games that end normally.
-- ---------------------------------------------------------------------------
-- create extension if not exists pg_cron;
-- select cron.schedule('buzzer-purge-stale', '0 4 * * *', $cron$ select delete_stale_rooms(7); $cron$);
