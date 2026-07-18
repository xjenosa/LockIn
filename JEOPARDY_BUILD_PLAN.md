# Buzzer Jeopardy — One-Shot Build Prompt for Claude Fable 5

> **How to use this file:** Paste this entire document into Claude Fable 5 as the build prompt.
> Provide your Supabase URL + anon key when asked (or let Fable scaffold `.env.local` for you to fill).
> The goal is a single, complete, deployable Next.js app — built in one shot.

---

## 0. Mission

Build a **live, Kahoot-style buzzer Jeopardy game** for in-person events (a Korean BBQ picnic for a coding club; later reused by a UN eco-club).

- **One host** runs the game on a laptop and projects the Jeopardy board + questions on a big screen.
- **Players** join from their **phones**, form **teams**, and hit a big **buzzer** to answer.
- Answers are spoken **out loud** in person — the phone is a **buzzer + scoreboard**, not an answer-input device (except Final Jeopardy, which is typed + secret).
- The host adjudicates (marks right/wrong); scores update live on a **team leaderboard**.
- Content is **swappable question packs** so the same app works for the coding club AND the eco-club.

Build the **whole thing** deployable to **Vercel**, with **Supabase** (Postgres + Realtime) as the backend. Ship all four question packs fully written.

---

## 1. Tech Stack (use exactly this)

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS** for styling
- **Supabase** — Postgres for state, Realtime for live sync, Postgres RPC functions for atomic actions
- **`@supabase/supabase-js`** client
- **`qrcode.react`** for the join QR code
- **`next/font`** (Google) for a bold condensed display font (e.g. **Anton** or **Oswald**) to approximate the Jeopardy look
- Deploy target: **Vercel**. Everything must run on Vercel's free tier + Supabase free tier.

No separate WebSocket server — all realtime goes through Supabase. No auth provider — identity is name + team + room code (Kahoot-style).

---

## 2. Roles & Screens

### Host (laptop, projected)
1. **Create game:** pick a question pack from a dropdown → generates a room `code` + `host_token` (stored in `localStorage`). 
2. **Lobby:** big join **QR code** + room code + live list of teams/players as they join. "Start Game" button.
3. **Board:** 6 categories × 5 clue values (200/400/600/800/1000). Host taps a clue to open it. Played clues grey out.
4. **Clue view:** shows the clue big (with optional image). Buzzer opens for players. Shows **who buzzed first**. Host has **✓ Correct** / **✗ Wrong** / **Reveal Answer** / **Back to Board** controls. Synced countdown timer.
5. **Leaderboard:** team scores, always visible (sidebar or toggle). 
6. **Final Jeopardy:** show category → teams wager → reveal clue → teams type secret answers → host reveals each team's wager+answer and marks right/wrong.
7. **Results:** final standings, winner celebration.

> **Optional projector split (include it):** `/board/[code]` is a clean, **read-only** board/clue view for the projector, while the host keeps controls on `/host/[code]`. Both stay in sync via Realtime. If the host prefers one screen, `/host` also renders the board.

### Player (phone, mobile-first)
1. **Join:** enter name → **create a team** (name it, pick a color) or **join an existing team** from a list.
2. **Buzzer:** full-screen button. **Locked/red** when closed; **glowing/green** when open. Vibrates (`navigator.vibrate`) on buzz. Shows "🚀 You buzzed first!" or "🔒 Team X buzzed."
3. **Score:** their team's score + rank, always visible.
4. **Final Jeopardy:** secret **wager** input, then secret **answer** textbox, submitted before the timer ends.

---

## 3. Game Flow / State Machine

`rooms.phase` drives everything:

```
lobby ─▶ playing ─▶ final_wager ─▶ final_clue ─▶ final_answer ─▶ final_reveal ─▶ results
```

- **lobby** — teams join. Host clicks Start → `playing`.
- **playing** — board is live; host opens clues, adjudicates, awards points. When all 30 clues are revealed (or host clicks "Go to Final"), → `final_wager`.
- **final_wager** — Final category shown; each team submits a hidden wager (0 … current team score, min 0).
- **final_clue** — Final clue revealed; answer timer starts.
- **final_answer** — teams type secret answers before deadline.
- **final_reveal** — host steps through each team: reveal answer + wager, mark ✓/✗, apply ± wager.
- **results** — final leaderboard + winner. Host can `reset_game` to play again (same or new pack).

---

## 4. The Buzzer — Atomic "First to Buzz" (the critical part)

**Requirement:** when multiple phones buzz within milliseconds, exactly ONE team wins, decided by **server receipt order** — never a client clock. Do this with a Postgres row lock inside an RPC. `SELECT ... FOR UPDATE` on the room row serializes concurrent buzzers; the first transaction sets the winner, the rest see it's taken and lose.

```sql
create or replace function claim_buzz(p_code text, p_player_id uuid, p_clue_id text)
returns table (won boolean, team_id uuid, team_name text)
language plpgsql security definer as $$
declare
  v_room   rooms%rowtype;
  v_team   teams%rowtype;
  v_pname  text;
begin
  -- Row lock: concurrent buzzers queue here; first one through wins.
  select * into v_room from rooms where code = p_code for update;
  if not found then raise exception 'room not found'; end if;

  select t.* into v_team
    from players pl join teams t on t.id = pl.team_id
   where pl.id = p_player_id;
  select name into v_pname from players where id = p_player_id;

  if v_room.buzzer_open
     and v_room.active_clue_id = p_clue_id
     and v_room.buzzed_team_id is null
     and not (v_team.id = any(v_room.locked_out_team_ids)) then
       update rooms
          set buzzed_team_id = v_team.id,
              buzzed_player_name = v_pname
        where id = v_room.id;
       insert into buzzes(room_id, clue_id, team_id, player_name)
              values (v_room.id, p_clue_id, v_team.id, v_pname);
       return query select true, v_team.id, v_team.name;
  else
       return query select false, v_team.id, v_team.name;
  end if;
end $$;
```

Player buzz path: `supabase.rpc('claim_buzz', { p_code, p_player_id, p_clue_id })`. Everyone subscribes to Realtime changes on the `rooms` row → the winner (`buzzed_team_id` + `buzzed_player_name`) appears on all screens instantly.

**After a wrong answer:** host calls `reopen_after_miss` → adds the missed team to `locked_out_team_ids`, applies the −value penalty, clears `buzzed_team_id`, keeps `buzzer_open = true` so other teams can steal. When no one is left / host gives up → reveal answer, close clue.

> **Honesty note to keep in the UI:** ordering is by server receipt, so a team on faster Wi‑Fi has a tiny edge over cellular. That's standard for online buzzers and fine for a picnic — don't try to "fix" it with client timestamps (that's exploitable).

---

## 5. Data Model (Supabase / Postgres)

```sql
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- short join code, e.g. "PICNIC" or "K7Q2"
  host_token uuid not null default gen_random_uuid(),
  pack_id text not null,
  phase text not null default 'lobby',
  active_clue_id text,                       -- e.g. "cat3-600"
  buzzer_open boolean not null default false,
  buzzed_team_id uuid,
  buzzed_player_name text,
  clue_opened_at timestamptz,                -- for a synced countdown across all clients
  timer_seconds int not null default 12,
  locked_out_team_ids uuid[] not null default '{}',
  revealed_clue_ids text[] not null default '{}',
  control_team_id uuid,                       -- (optional) team that picks next clue
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  color text not null default '#facc15',
  score int not null default 0,
  final_wager int,
  final_answer text,
  final_locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, name)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  name text not null,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table buzzes (          -- audit log / "buzz order" flavor
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  clue_id text not null,
  team_id uuid not null references teams(id) on delete cascade,
  player_name text,
  created_at timestamptz not null default now()
);
```

### Security model (simple + cheat-resistant)
- **Enable RLS** on all tables. Add policies allowing **anon `SELECT`** (clients need to read live state) but **no direct anon `INSERT`/`UPDATE`/`DELETE`**.
- **All writes go through `SECURITY DEFINER` RPC functions** (they bypass RLS). This keeps casual players from POSTing themselves 9000 points via the public anon key.
- **Host-only RPCs take `host_token`** and verify it against `rooms.host_token` before mutating.

### RPCs to implement
| RPC | Who | Does |
|---|---|---|
| `create_room(p_pack_id)` | anyone | make room, return `code` + `host_token` |
| `join_room(p_code, p_player_name, p_team_name, p_team_color, p_existing_team_id)` | player | create/join team, create player, return `player_id` + `team_id` |
| `claim_buzz(p_code, p_player_id, p_clue_id)` | player | atomic buzz (above) |
| `submit_final(p_player_id, p_wager, p_answer)` | player | set their team's wager/answer if `final_locked = false` |
| `host_open_clue(p_host_token, p_clue_id, p_timer, p_is_daily_double)` | host | open clue, reset buzz/lockouts, set `clue_opened_at` |
| `host_reopen_after_miss(p_host_token, p_penalty)` | host | lock out missed team, apply −value, clear winner, keep open |
| `host_award(p_host_token, p_team_id, p_delta)` | host | `teams.score += p_delta` |
| `host_close_clue(p_host_token)` | host | mark clue revealed, close buzzer, clear active clue |
| `host_set_phase(p_host_token, p_phase)` | host | advance state machine |
| `host_lock_final(p_host_token)` | host | set `final_locked = true` on all teams |
| `host_reset_game(p_host_token)` | host | scores→0, clear revealed/final, phase→`lobby` |

> **IMPORTANT — enable Realtime:** add `rooms`, `teams`, and `players` to the `supabase_realtime` publication (Supabase → Database → Replication), or clients won't receive live updates.

Clients subscribe to `postgres_changes` on `rooms` (filtered by `code`), `teams` and `players` (filtered by `room_id`). On any change, patch local state; also do a full fetch on (re)subscribe so late joiners are correct.

---

## 6. Content Model — Swappable Question Packs

Packs are plain TypeScript data files in `/content/packs/*.ts`, registered in `/content/packs/index.ts`. Adding a pack = drop a file + one import. This is what makes the app reusable across clubs.

```ts
export type Clue = {
  value: number;            // 200 | 400 | 600 | 800 | 1000
  clue: string;             // shown to players ("This snake-named language…")
  answer: string;           // spoken response ("What is Python?")
  image?: string;           // optional: /public path or URL (memes, emoji art, logos)
  dailyDouble?: boolean;    // if true: controlling team wagers, no buzz, only they answer
};
export type Category = { name: string; clues: Clue[] };   // exactly 5, ascending value
export type Final = { category: string; clue: string; answer: string; image?: string };
export type Pack = {
  id: string;               // "picnic-general"
  name: string;             // "Picnic General Mix"
  description: string;
  categories: Category[];   // exactly 6
  final: Final;
};
```

Rules:
- 6 categories × 5 clues = **30 board clues** + **1 Final** per pack.
- Difficulty rises with value (200 = easy/fun, 1000 = hard).
- Randomly flag **1–2 clues** per pack as `dailyDouble` (or hardcode sensible ones).
- **Image clues:** support an optional `image`. For the shipped packs, prefer **text + emoji** so nothing breaks with no internet; leave the `image` slot ready for the host to drop files into `/public/packs/...`. (A picnic may have flaky Wi‑Fi — don't hard-depend on external image URLs.)

### Ship ALL FOUR packs, fully written:

**1. `picnic-general` — "Picnic General Mix"** (mixed business + CS, Gen-Z crowd)
Categories: `Certified Meme Review` · `Finish the Lyric` · `Emoji Decode` · `K-BBQ & Global Eats` · `Only in Toronto` · `Science & Tech (Lite)`
Final: `Pop Culture of the 2020s`

**2. `toronto-canada` — "Toronto & Canada"**
Categories: `Toronto Landmarks` · `Canadian Icons` · `The 6ix in Sports` · `Canadian Slang & Culture` · `Eh? History` · `Coast to Coast (Geography)`
Final: `Canadian Firsts`

**3. `un-eco` — "UN Eco-Club: Planet & Sustainability"**
Categories: `Climate Change` · `Renewable Energy` · `The UN & the SDGs` · `Wildlife & Biodiversity` · `Recycling & Waste` · `Famous Environmentalists`
Final: `Global Agreements` (Paris, Kyoto, Montreal Protocol…)

**4. `coding-tech` — "Coding & Tech"** (CS-leaning bonus round)
Categories: `Programming Languages` · `Algorithms & Data Structures` · `Spot the Bug` · `Tech History` · `Internet Culture` · `Acronym Soup`
Final: `Founders & Companies`

Write real, correct, genuinely fun clues in Jeopardy's answer-and-question style (clue is a statement; correct response is a question). Keep them **fair and inclusive** for a mix of non-technical and technical players.

---

## 7. Teams, Scoring & Special Rounds

- **Teams:** any member can buzz; the **team** wins the buzz and shares one score. A solo joiner = a team of one. Show which player physically buzzed for fun.
- **Standard clue:** buzz-winner answers aloud → host ✓ = `+value`, ✗ = `−value` + reopen for steals.
- **Daily Double:** only the **controlling team** plays it (the team that picked, or host's choice). They **wager** up to `max(their score, 1000)` **before** seeing the clue. No buzzing. Host marks ✓/✗ → apply ±wager.
- **Final Jeopardy:** every team wagers `0 … their current score`. Clue revealed → each team types **one secret answer** (any member can submit/edit until locked or timer ends). Host reveals each team's answer + wager and marks ✓/✗, applying ±wager. Ties allowed.
- **Leaderboard:** sort teams by score desc; show rank, name, color, score. Live on host + player screens.

---

## 8. Look & Feel

- **Jeopardy board:** deep royal blue `#060CE9`, gold clue values `#D69F4C`/`#FFCC00`, white bold condensed text, subtle cell borders, big and legible from across a picnic lawn. Category headers in caps.
- **Clue reveal:** full-screen blue, huge centered clue text, optional image, big synced countdown ring/bar.
- **Player buzzer:** full-viewport tap target. Closed = dim/red "🔒 Wait…"; open = bright/green pulsing "BUZZ!"; won = "🚀 First!"; lost = "🔒 {team} got it". Haptic buzz on press. One-handed friendly.
- **Motion:** small celebratory animation on correct answers and on the winner reveal. Keep it tasteful and fast.
- Fully **responsive**: host = landscape/desktop; player = portrait/mobile.

---

## 9. Edge Cases & Resilience (handle these)

- **Reconnect:** store `player_id` (players) and `host_token` (host) in `localStorage` keyed by room `code`; auto-resume on reload. Host reloading must not lose the game (state lives in DB).
- **Duplicate names:** player names need not be unique; **team names are unique per room** (enforced by constraint — surface a friendly error).
- **Double/spam buzz:** disable the button locally after a buzz; server still guarantees one winner via the lock. Ignore buzzes when `buzzer_open = false` or wrong `active_clue_id`.
- **Host-only actions:** every mutating host action verifies `host_token` server-side. Players cannot open clues, award points, or advance phase even with the anon key.
- **Late joiners:** can join mid-game (lobby closed → still allow join into a team; they just start from current score).
- **Board completion:** auto-enable "Go to Final" when all 30 clues are revealed.
- **Replay:** `host_reset_game` returns to lobby with scores cleared; host may switch packs.
- **No/flaky internet:** don't hard-depend on external images; keep payloads small; degrade gracefully.
- **Timer:** derive remaining time from `clue_opened_at + timer_seconds` so every screen agrees even if one refreshes.

---

## 10. Suggested File / Route Structure

```
/app
  /page.tsx                     # landing: Join (code+name) | Host a game
  /host/page.tsx                # create game: pick pack -> redirect to /host/[code]
  /host/[code]/page.tsx         # lobby + live board + control panel (host_token gated)
  /board/[code]/page.tsx        # read-only projector board/clue view (optional, synced)
  /play/[code]/page.tsx         # player: join team, buzzer, score, final answer
/components
  Board.tsx  ClueView.tsx  Buzzer.tsx  Leaderboard.tsx  Lobby.tsx
  TeamJoin.tsx  FinalJeopardy.tsx  QRJoin.tsx  Timer.tsx  HostControls.tsx
/lib
  supabaseClient.ts             # createClient(url, anonKey)
  useRoom.ts                    # realtime subscription hook (rooms/teams/players)
  useLocalIdentity.ts           # player_id / host_token persistence
  game.ts                       # phase helpers, scoring, clue-id utils
/content
  types.ts
  /packs/index.ts               # registry
  /packs/picnic-general.ts
  /packs/toronto-canada.ts
  /packs/un-eco.ts
  /packs/coding-tech.ts
/supabase
  schema.sql                    # tables + RLS policies
  functions.sql                 # all RPCs
.env.local.example              # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
README.md                       # setup + deploy + how to add a pack
```

---

## 11. Setup & Deploy (put this in README.md)

1. **Supabase:** create a free project. In the SQL editor, run `supabase/schema.sql` then `supabase/functions.sql`.
2. **Enable Realtime:** Database → Replication → add `rooms`, `teams`, `players` to the `supabase_realtime` publication.
3. **Keys:** copy Project URL + anon public key.
4. **Local:** `npm install`, copy `.env.local.example` → `.env.local`, fill the two `NEXT_PUBLIC_...` vars, `npm run dev`.
5. **Deploy:** push to GitHub → import into Vercel → set the same two env vars → deploy.
6. **Game day:** open `/host`, pick a pack, project the board + QR. Players scan the QR (or go to the URL + enter the code), pick/create a team, and buzz. Read clues aloud, tap ✓/✗, crown a winner. 🎉

---

## 12. Acceptance Criteria (definition of done)

- [ ] Host can create a game, pick any of the 4 packs, and see a working join **QR code** + room code.
- [ ] Players join on phones, create/join **teams**, and appear live in the host lobby.
- [ ] Host opens a clue; players' buzzers go live; **exactly one team** is credited as first, decided server-side, even with simultaneous taps.
- [ ] Wrong answer locks out that team, applies −value, and lets **other teams steal**; correct applies +value.
- [ ] **Daily Double** wager flow works (controlling team only, no buzz).
- [ ] **Final Jeopardy** works end-to-end: secret wagers → clue → secret typed answers → host reveal + adjudication → ± wager.
- [ ] **Team leaderboard** updates live on host and player screens.
- [ ] Synced **countdown timer** shows consistently across screens.
- [ ] Host and players **survive a page reload** without losing the game.
- [ ] Players **cannot** award points / control the board (host_token enforced server-side).
- [ ] All **four packs** are fully written with correct, fun clues + a Final each.
- [ ] Deploys cleanly to **Vercel** on free tier; works on real phones over the internet.

---

## 13. Optional Stretch (do NOT block the one-shot on these)

- Sound FX (buzz, correct, wrong, Final "think" music) with a mute toggle.
- "Wager" animations / confetti on the winner.
- Emoji reactions from players between clues.
- A pack **editor UI** (so non-coders can write clues without touching files).
- Buzz-order list ("Team B was 0.3s behind") from the `buzzes` log.
- Image clues wired up for the meme/emoji categories.

---

**Build all of Sections 1–12 now, in one shot. Prioritize a rock-solid buzzer, correct scoring, live sync, and all four packs fully written. Keep it clean, mobile-first for players, and projector-friendly for the host.**
