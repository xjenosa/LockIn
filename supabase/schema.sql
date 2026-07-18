-- Buzzer Jeopardy — schema. Run this FIRST in the Supabase SQL editor, then functions.sql.

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
  control_team_id uuid,                          -- team that answered last correct clue (default DD team)
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

-- Final Jeopardy wagers/answers: NO select policy -> phones can't peek at
-- other teams. Host reads them via the host_get_finals RPC.
create table if not exists final_submissions (
  team_id uuid primary key references teams(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  wager int not null default 0,
  answer text not null default '',
  updated_at timestamptz not null default now()
);

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
-- Row Level Security: public (anon) may READ live game state, never write.
-- All writes go through SECURITY DEFINER functions in functions.sql.
-- room_hosts and final_submissions have RLS enabled with no policies at all:
-- invisible to clients.
-- ---------------------------------------------------------------------------
alter table rooms enable row level security;
alter table room_hosts enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table final_submissions enable row level security;
alter table buzzes enable row level security;

create policy "public read rooms"   on rooms   for select using (true);
create policy "public read teams"   on teams   for select using (true);
create policy "public read players" on players for select using (true);
create policy "public read buzzes"  on buzzes  for select using (true);

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes for the tables clients watch.
-- (If this errors with "already member", that's fine — it's already enabled.)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table players;
