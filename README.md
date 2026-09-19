# 🔒 LockIn

Live **team buzzer trivia** for in-person events. The host projects the board and reads clues aloud; players scan a QR code, form teams, and race to lock in on their phones. Scores update live on a team leaderboard. Includes Wildcards (secret-wager bonus clues), Last Call (the final wager round), and four ready-to-play question packs.

**Stack:** Next.js (App Router) + Tailwind + Neon (serverless Postgres) → deploys to Vercel free tier.

## Setup (one time, ~5 minutes)

1. **Neon**: create a free project at [neon.tech](https://neon.tech), then copy the connection string from **Connect** (use the pooled host — the one with `-pooler` in it).
2. Copy `.env.local.example` → `.env.local` and set `DATABASE_URL` to that string. It is **server-only**: never rename it with a `NEXT_PUBLIC_` prefix, which would ship your database password to every player's phone.
3. Apply the schema:

   ```bash
   npm install
   node scripts/migrate.mjs
   ```

   That runs [`db/schema.sql`](db/schema.sql) then [`db/functions.sql`](db/functions.sql). **Both files are idempotent** — run the script again any time to pick up a change, on a fresh database or a live one. There are no migration files to track.
   - [`db/cleanup.sql`](db/cleanup.sql) is optional maintenance, not setup. Its top section is safe to run any time; the destructive extras below the divider are commented out.
4. **Verify** (optional, recommended after any change to `db/`):

   ```bash
   node scripts/simulate.mjs
   ```

   A headless test suite — the closest thing this repo has to tests. It drives every function against your real database at inhuman intensity: 20 buzzes in the same millisecond, taps before the buzzer arms, concurrent undo storms, and a full 30-clue playthrough with Last Call. Exit code 0 = all checks passed.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, but note phones can't reach `localhost`; for a real multi-phone test, deploy to Vercel (or use `next dev -H 0.0.0.0` + your LAN IP).

## How it talks to the database

Browsers never reach Postgres. Reads go through `app/api/room/[code]` (one round trip for room + teams + players); writes go through `app/api/rpc`, which will only invoke functions on an explicit **allowlist**. That allowlist is the security boundary — it replaced Supabase's RLS policies and anon key. All game logic stays in [`db/functions.sql`](db/functions.sql); the routes are thin pass-throughs, and `DATABASE_URL` never leaves the server.

There is no realtime push. Clients poll `app/api/room/[code]` every 1.5s, and **the poll pauses on hidden tabs** — both to keep the app cheap and so Neon can suspend between games.

### Neon suspends when idle, and that's fine

Neon scales compute to zero after a few minutes of inactivity and **auto-resumes on the next query** (sub-second). There is nothing to unpause and no keep-alive cron to maintain; the first request after a quiet spell is just slightly slow.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → Add New Project → import the repo.
3. Add `DATABASE_URL` as an environment variable (plus `NEXT_PUBLIC_SITE_URL` if you set one).
4. Deploy. Done: share `https://your-app.vercel.app`.

## Game day

| Screen | URL | Who |
|---|---|---|
| Create game | `/host` | you, once |
| Host controls | `/host/XXXX` | your laptop (has the host key in localStorage) |
| Projector | `/board/XXXX` | read-only mirror for the big screen |
| Players | `/play/XXXX` | everyone's phones (QR on the lobby/projector) |

**Flow:** pick a pack → project the lobby QR → players join/create teams → Start game → tap a clue, **read it aloud**, then hit **"Open buzzers"** → first to lock in locks everyone else out → mark ✓ (+value) or ✗ (−value, that team is locked out and others can steal) → Last Call when the board's done (secret wagers → 60s clue → typed answers → dramatic reveal, lowest score first) → confetti. **"Play again"** resets scores back to the lobby.

- **Wildcards:** marked clues splash "WILDCARD". Only the wagering team plays; ask their wager out loud, type it, reveal.
- Everything survives page reloads (host key + player identity are in localStorage; game state lives in Postgres).
- Buzz order is decided **server-side** by a Postgres row lock, so phone clocks can't cheat. Faster Wi-Fi does have a tiny edge; that's every online buzzer.
- Players can't touch scores: every write goes through a database function, host actions require the host token, and Last Call answers are never returned to clients.

## Brand

The visual identity (name, palette, type, motion) is documented in [`BRAND.md`](BRAND.md). Short version: ink background, teal means live, coral means stakes, Archivo Black carries the volume.

## Question packs

Ships with: **Picnic General Mix** (memes, lyrics, emoji, K-BBQ, Toronto, light tech) · **Toronto & Canada** · **Jakarta & Indonesia** · **Computer Science**.

**To edit clues:** open [`content/packs/`](content/packs/). It's plain TypeScript; edit any `clue`/`answer` string.
**To add a pack:** copy a pack file, change `id`/`name`/content, register it in [`content/packs/index.ts`](content/packs/index.ts). 6 categories × 5 clues + 1 final. Set `dailyDouble: true` on 1-2 clues (that field is the internal name for a Wildcard). Redeploy.
