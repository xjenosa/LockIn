-- Buzzer — tables, RLS and realtime. Run this FIRST in the Supabase SQL editor,
-- then functions.sql.
--
-- Both files are IDEMPOTENT: re-running them over a live database brings it up
-- to date without touching existing rows. That's why there is no migrations
-- folder — after pulling changes, just run these two again in order.

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  pack_id text not null,
  phase text not null default 'lobby',           -- lobby | playing | final_wager | final_clue | final_reveal | results
  active_clue_id text,                           -- e.g. "c2-600"
  buzzer_open boolean not null default false,
  buzzed_team_id uuid,
  buzzed_player_name text,
  clue_opened_at timestamptz,                    -- timer anchor; null on a daily double = still in wager stage
  timer_seconds int not null default 12,
  locked_out_team_ids uuid[] not null default '{}',
  revealed_clue_ids text[] not null default '{}',
  control_team_id uuid,                          -- team whose turn it is to pick (default DD team)
  buzzer_arms_at timestamptz,                    -- buzzer goes live at this moment; earlier taps are ignored
  pick_order uuid[] not null default '{}',       -- rotation ring of team ids
  pick_index int not null default 0,             -- whose turn it is: pick_order[pick_index + 1]
  active_is_dd boolean not null default false,
  dd_team_id uuid,
  dd_wager int,
  answer_revealed boolean not null default false,
  finals_locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Host secret lives in its own table with NO select policy, so the public
-- anon key can never read it (rooms itself is publicly readable for realtime).
create table if not exists room_hosts (
  room_id uuid primary key references rooms(id) on delete cascade,
  host_token uuid unique not null default gen_random_uuid()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  color text not null default '#facc15',
  score int not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, name)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Final round wagers/answers: NO select policy -> phones can't peek at
-- other teams. Host reads them via the host_get_finals RPC.
create table if not exists final_submissions (
  team_id uuid primary key references teams(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  wager int not null default 0,
  answer text not null default '',
  updated_at timestamptz not null default now()
);

-- Scoring audit trail so a misjudged answer can be taken back. label can hold
-- the correct answer, so like final_submissions it gets NO select policy — the
-- host reads it through the host_get_score_log RPC.
create table if not exists score_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  delta int not null,
  reason text not null constraint score_events_reason_check
    check (reason in ('correct','miss','dd_correct','dd_wrong','final','manual')),
  clue_id text,
  label text,
  reversed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists score_events_room_created_idx
  on score_events (room_id, created_at desc);

-- Audit log of every buzz (winner-or-not), for fun stats.
create table if not exists buzzes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  clue_id text not null,
  team_id uuid not null references teams(id) on delete cascade,
  player_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Upgrades for databases created before these columns existed.
--
-- "create table if not exists" is a no-op once the table exists, so a column
-- added to the block above would never reach a live database without this.
-- ANY new column must be repeated here, or existing installs silently miss it.
-- ---------------------------------------------------------------------------
alter table rooms add column if not exists buzzer_arms_at timestamptz;
alter table rooms add column if not exists pick_order uuid[] not null default '{}';
alter table rooms add column if not exists pick_index int not null default 0;

-- ---------------------------------------------------------------------------
-- Row Level Security: public (anon) may READ live game state, never write.
-- All writes go through SECURITY DEFINER functions in functions.sql.
-- room_hosts, final_submissions and score_events have RLS enabled with no
-- policies at all: invisible to clients.
-- ---------------------------------------------------------------------------
alter table rooms enable row level security;
alter table room_hosts enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table final_submissions enable row level security;
alter table score_events enable row level security;
alter table buzzes enable row level security;

-- Dropped first so this file can be re-run over a live database.
drop policy if exists "public read rooms"   on rooms;
drop policy if exists "public read teams"   on teams;
drop policy if exists "public read players" on players;
drop policy if exists "public read buzzes"  on buzzes;

create policy "public read rooms"   on rooms   for select using (true);
create policy "public read teams"   on teams   for select using (true);
create policy "public read players" on players for select using (true);
create policy "public read buzzes"  on buzzes  for select using (true);

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes for the tables clients watch. score_events is
-- deliberately excluded — broadcasting it would push answer text to every phone.
-- ---------------------------------------------------------------------------
do $$
declare v_t text;
begin
  foreach v_t in array array['rooms', 'teams', 'players'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_t);
    end if;
  end loop;
end $$;
