-- LockIn: tables. Run this FIRST in the Neon SQL editor, then functions.sql.
--
-- Both files are IDEMPOTENT: re-running them over a live database brings it up
-- to date without touching existing rows. There is deliberately no migrations
-- folder; after changing either file, run both again in order.
--
-- Naming contract: dd_* columns implement the Wildcard mechanic and keep their
-- legacy names on purpose (lib/types.ts and the UI read them). Renaming any
-- column here silently breaks the typed client reads. localStorage keys and
-- clue id format have the same freeze; see lib/identity.ts and lib/game.ts.
--
-- ACCESS MODEL (this changed when we left Supabase): there is no RLS and no
-- public anon role here. Browsers never reach this database at all -- they call
-- app/api/rpc/route.ts (an explicit ALLOWLIST of the functions in
-- functions.sql) and app/api/room/[code]/route.ts. DATABASE_URL is server-only.
-- That allowlist is the security boundary now, so adding an entry to it is the
-- dangerous step, not granting a table policy.

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  pack_id text not null,
  phase text not null default 'lobby',           -- lobby | playing | final_wager | final_clue | final_reveal | results
  active_clue_id text,                           -- e.g. "c2-600"
  buzzer_open boolean not null default false,
  buzzed_team_id uuid,
  buzzed_player_name text,
  clue_opened_at timestamptz,                    -- timer anchor; null on a Wildcard = still in wager stage
  timer_seconds int not null default 12,
  locked_out_team_ids uuid[] not null default '{}',
  revealed_clue_ids text[] not null default '{}',
  control_team_id uuid,                          -- team holding the pick; also the default Wildcard wagering team
  buzzer_arms_at timestamptz,                    -- buzzer goes live at this moment; claim_buzz drops earlier taps
  pick_order uuid[] not null default '{}',       -- rotation ring of team ids
  pick_index int not null default 0,             -- 0-based position; control = pick_order[pick_index + 1] (SQL arrays are 1-indexed)
  active_is_dd boolean not null default false,
  dd_team_id uuid,
  dd_wager int,
  answer_revealed boolean not null default false,
  finals_locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- The host secret lives in its own table so that no read path can return it:
-- app/api/room/[code] selects rooms/teams/players only, and nothing joins this.
-- Never move host_token onto rooms.
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

-- Last Call wagers/answers, one row per team. No endpoint returns this table
-- directly, so phones cannot peek at other teams: the host reads it through
-- host_get_finals, and a player only ever sees their own team's row via
-- get_my_final.
create table if not exists final_submissions (
  team_id uuid primary key references teams(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  wager int not null default 0,
  answer text not null default '',
  updated_at timestamptz not null default now()
);

-- Scoring audit trail; host_undo_event flips reversed instead of deleting.
-- label can hold the correct answer, so like final_submissions it is never
-- exposed directly; the host reads it through host_get_score_log. The reason
-- CHECK list is mirrored by ScoreReason in lib/types.ts.
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

-- Postgres does not index foreign keys automatically, and app/api/room/[code]
-- filters both of these by room_id on every poll -- which, with realtime gone,
-- is now the hottest query in the app (once per ~1.5s per connected client).
-- Cheap indexes, and they keep Neon's compute time down.
create index if not exists teams_room_idx   on teams (room_id);
create index if not exists players_room_idx on players (room_id);

-- ---------------------------------------------------------------------------
-- Upgrade block for databases created before newer columns existed.
--
-- "create table if not exists" is a no-op once the table exists, so a column
-- added only to the create block above never reaches a live database. RULE:
-- every column added to a create block MUST also get an "add column if not
-- exists" line here, or existing installs silently miss it.
-- ---------------------------------------------------------------------------
alter table rooms add column if not exists buzzer_arms_at timestamptz;
alter table rooms add column if not exists pick_order uuid[] not null default '{}';
alter table rooms add column if not exists pick_index int not null default 0;

-- ---------------------------------------------------------------------------
-- Deliberately absent: RLS, table policies, and a realtime publication.
--
-- All three existed only to make Supabase safe, where the browser held an anon
-- key and spoke to PostgREST directly. Neon has no PostgREST, no realtime, and
-- no anon/authenticated roles -- so `enable row level security` is pointless
-- here and `alter publication supabase_realtime ...` would ERROR outright.
-- The boundary moved into the app instead; see the ACCESS MODEL note at the
-- top. Live updates are now the poll in lib/useRoom.ts.
-- ---------------------------------------------------------------------------
