# 🔒 LOCKIN

Live **team buzzer trivia** for in-person events. The host projects the board and reads clues aloud; players scan a QR code, form teams, and race to lock in on their phones. Scores update live on a team leaderboard. Includes Wildcards (secret-wager bonus clues), Last Call (the final wager round), and four ready-to-play question packs.

**Stack:** Next.js (App Router) + Tailwind + Supabase (Postgres + Realtime) → deploys to Vercel free tier.

## Setup (one time, ~5 minutes)

1. **Supabase**: create a free project at [supabase.com](https://supabase.com).
2. In the Supabase **SQL Editor**, paste & run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/functions.sql`](supabase/functions.sql).
   - **Both files are idempotent.** Run them on a brand-new project or over a live one. After pulling changes, just run the two again in order. There are no migration files to track.
   - The schema also enables Realtime on `rooms` / `teams` / `players`. Verify under **Database → Replication** that the `supabase_realtime` publication includes all three. (There's a 5-second polling fallback, but realtime makes buzzes feel instant.)
   - [`supabase/cleanup.sql`](supabase/cleanup.sql) is optional maintenance, not setup. Its top section is safe to run any time; the destructive extras below the divider are commented out.
3. **Keys** from Project Settings → API: copy the **Project URL** and the **anon/publishable key**.
4. Copy `.env.local.example` → `.env.local` and fill both values. The URL must be the **bare** project URL (no `/rest/v1/`).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, but note phones can't reach `localhost`; for a real multi-phone test, deploy to Vercel (or use `next dev -H 0.0.0.0` + your LAN IP).

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → Add New Project → import the repo.
3. Add the two environment variables from `.env.local`.
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
- Everything survives page reloads (host key + player identity are in localStorage; game state lives in Supabase).
- Buzz order is decided **server-side** by a Postgres row lock, so phone clocks can't cheat. Faster Wi-Fi does have a tiny edge; that's every online buzzer.
- Players can't touch scores: all writes go through server functions; host actions require the host token; Last Call answers are unreadable by clients.

## Brand

The visual identity (name, palette, type, motion) is documented in [`BRAND.md`](BRAND.md). Short version: ink background, teal means live, coral means stakes, Archivo Black carries the volume.

## Question packs

Ships with: **Picnic General Mix** (memes, lyrics, emoji, K-BBQ, Toronto, light tech) · **Toronto & Canada** · **Indonesia** · **Computer Science**.

**To edit clues:** open [`content/packs/`](content/packs/). It's plain TypeScript; edit any `clue`/`answer` string.
**To add a pack:** copy a pack file, change `id`/`name`/content, register it in [`content/packs/index.ts`](content/packs/index.ts). 6 categories × 5 clues + 1 final. Set `dailyDouble: true` on 1-2 clues (that field is the internal name for a Wildcard). Redeploy.
