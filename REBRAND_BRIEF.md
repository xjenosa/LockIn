# Rebrand brief for Claude Fable

You are rebranding an existing, working web app so that it is visually and legally distinct from *Jeopardy!*, while keeping every piece of game functionality intact. You have full creative latitude on the new identity. This document is your source of truth: it tells you what the app is, exactly where the *Jeopardy* trade dress lives, what you may change, what you must not break, and how to prove you are done.

Do not ask for confirmation before starting. Read the files listed under "Recon," build the new identity, apply it, then run the "Definition of done" checks and report results.

---

## 1. What the app is

A live, in-person team trivia buzzer game. One host runs a board on a laptop and projects it on a big screen. Players scan a QR code, form teams, and buzz in on their phones. Buzz order is resolved server-side by a Postgres row lock; scores update live over Supabase Realtime.

- **Stack:** Next.js (App Router) + Tailwind + Supabase (Postgres + Realtime), deployed on Vercel.
- **Screens:** `/` landing/join, `/host` create, `/host/[code]` host controls, `/board/[code]` read-only projector mirror, `/play/[code]` phones.
- **Current name:** "Buzzer". **Current fonts:** Anton (display) + Inter (body). **Current palette:** *Jeopardy* royal blue + gold (see below).

This is a real-time party game read from **across a room on a projector** and driven on **phones under time pressure**. That context, not a design mock, is the bar every choice is judged against.

---

## 2. The creative mandate

**Ambition level: ambitious, but projector-proof.** Deliver a full, distinct identity, not a recolor: a name, a wordmark, a coherent design system, purposeful motion, and designed "hero moments." Push hard where it is safe to push, and stay disciplined where the room will punish you.

Work in this order so the boldness stays coherent:

1. **Name.** Propose 3 to 5 candidate names, each with a one-line rationale and a wordmark direction. Pick a lead and note it clearly. Keep "Buzzer" as the fallback if nothing beats it. The name must not evoke *Jeopardy* or any TV quiz brand.
2. **Concept and design system first.** Before touching screens, write `BRAND.md` at the repo root defining: the concept/voice in 2 to 3 sentences, the color tokens (with hex + role), the type pairing, spacing/radius/shadow conventions, and the motion vocabulary. Everything downstream references this.
3. **Then apply** the system screen by screen.

**Hero moments to spend creativity on:** the landing/join + lobby QR, the board, opening a clue (the arming countdown and "buzzers open" state), the **buzz-in confirmation**, the **answer reveal**, the renamed bonus-clue splash, the **final round** (secret wager, clue, dramatic lowest-score-first reveal), and the winner/confetti moment.

**Copy rules (non-negotiable, from the owner's stated preference):**
- **No em dashes** anywhere in user-facing copy, `BRAND.md`, or this repo's prose. Use commas, colons, parentheses, or separate sentences.
- **No tagline.** The wordmark stands alone. Do not add a marketing sub-line under the logo.

---

## 3. The *Jeopardy* trade dress: what MUST change

These are the specific things that make it read as a *Jeopardy* clone. All of them change.

### 3a. Colors (the biggest single tell)
The exact *Jeopardy* board blue and gold are hardcoded as Tailwind tokens in [tailwind.config.ts](tailwind.config.ts#L8-L13):

| Token | Current hex | What it is |
|---|---|---|
| `board` | `#060CE9` | the literal iconic *Jeopardy* board blue |
| `boarddark` | `#040875` | darker blue (page background) |
| `boardcell` | `#0510CE` | clue-cell blue |
| `gold` | `#FFCC00` | *Jeopardy* gold (clue values, headings) |
| `goldsoft` | `#D69F4C` | muted gold |

These 5 tokens are referenced **52 times across 15 files** (as `bg-board`, `text-gold`, `ring-gold`, `bg-boardcell`, `text-boarddark`, `bg-gold`, `hover:text-gold`, etc.).

**Recommended approach (low risk):** keep the token *names* and swap only their hex values in `tailwind.config.ts` to your new palette. That reskins all 15 files at once with zero find-and-replace. If you prefer semantic token names for cleanliness, you may rename them, but only with a complete find-and-replace across every file plus a passing build.

Also update, wherever they appear:
- `themeColor: "#060CE9"` in the viewport at [app/layout.tsx:17](app/layout.tsx#L17).
- The `<body>` background `bg-boarddark` at [app/layout.tsx:23](app/layout.tsx#L23) (fine if you keep the token name and change its hex).

Your new palette must include, as tokens: a page background, one or two surface levels, a primary, an accent, distinct **success/danger** colors for the host's correct/wrong (currently green/red, which is fine but should be tuned to the palette), and the team colors. None of it may be *Jeopardy* blue or gold.

### 3b. Typography
[app/layout.tsx:4-5](app/layout.tsx#L4-L5) loads **Anton**, a condensed Impact-style face chosen specifically "to approximate the *Jeopardy* look." Replace Anton with a distinctive display face that carries your new brand. Inter (body) is neutral and may stay or change. The `font-display` / `font-sans` token names in [tailwind.config.ts:14-17](tailwind.config.ts#L14-L17) can stay; just point them at the new fonts. Ensure the projector clue text and the board values are legible from the back of a room.

### 3c. The board look
[components/Board.tsx](components/Board.tsx) renders the signature artifact: a flat royal-blue 6-column grid, category headers in condensed caps, cells in blue showing **gold dollar values**, active cell ringed in gold. This is the *Jeopardy* board. Re-conceive it: new surface treatment, new value styling, and dollars become points (next section). Keep the 6-columns-by-5-rows structure and its responsiveness.

### 3d. Dollars become points
Money framing is a *Jeopardy* signal. Drop the `$`.

- **Single source of truth:** `fmtScore` at [lib/game.ts:45-46](lib/game.ts#L45-L46) emits `$` and `-$`. Change it here and it propagates to the leaderboard, host log, play screen, and clue-view team lists. Decide the new unit (a bare number, or a "pts" suffix) and apply it consistently.
- **Hardcoded `$` spots to fix by hand:**
  - [components/Board.tsx:57](components/Board.tsx#L57) `` `$${clue.value}` ``
  - [components/ClueView.tsx:138](components/ClueView.tsx#L138) `` `$${value}` `` (clue header)
  - [components/ClueView.tsx:216](components/ClueView.tsx#L216) `+${value}` (Correct button)
  - [components/ClueView.tsx:222](components/ClueView.tsx#L222) `−${value}` (Wrong button)
  - [app/host/[code]/page.tsx:49](app/host/[code]/page.tsx#L49) `clueTitle` builds `` `... $${...}` ``
  - [app/play/[code]/page.tsx:325](app/play/[code]/page.tsx#L325) "anything from $0 to ..."
- **Do NOT rescale the numeric values** (200/400/600/800/1000). Rescaling would mean editing all four packs and updating hardcoded wager floors (`Math.max(score, 1000)` at [components/ClueView.tsx:68](components/ClueView.tsx#L68) and the play-screen `maxWager`). Just drop the `$`. If you insist on rescaling, you own those floors too.

### 3e. The "answer in the form of a question" convention
Classic *Jeopardy* fingerprint. **Every** answer in all four packs is phrased as a question ("What is Python?"). That is **124 answers total** (each pack has exactly 31: 30 clues + 1 final).

- Convert each `answer` to the plain form ("Python"). Preserve the correct answer exactly; only strip the "What/Who/Where/When is/are" wrapper. Watch multi-part answers.
- Update the example in the type comment at [content/types.ts:4](content/types.ts#L4) so it no longer models the question form.
- Files: [content/packs/coding-tech.ts](content/packs/coding-tech.ts), [content/packs/picnic-general.ts](content/packs/picnic-general.ts), [content/packs/toronto-canada.ts](content/packs/toronto-canada.ts), [content/packs/un-eco.ts](content/packs/un-eco.ts).
- Safe to do: `answer` is only ever shown on reveal and in the host's answer-peek. No logic depends on its wording.

### 3f. Trademarked mechanic name: "Daily Double"
Rename the bonus-clue mechanic (the wager-before-you-see-it clue). **User-facing occurrences to rename:**
- [components/ClueView.tsx:76](components/ClueView.tsx#L76) the `DAILY DOUBLE!` splash.
- [components/Buzzer.tsx:85](components/Buzzer.tsx#L85) `"🎯 DAILY DOUBLE\nLook up!"`.
- Host log labels at [app/host/[code]/page.tsx:535-536](app/host/[code]/page.tsx#L535-L536) and the strings at [app/host/[code]/page.tsx:293](app/host/[code]/page.tsx#L293) and [:306](app/host/[code]/page.tsx#L306).
- [README.md:44](README.md#L44).

Pick a name that fits your concept (for example a "power play" or "wildcard" style beat). Keep it a single clear term.

### 3g. The final round
Good news: the app already calls it "**Final Round**," not "Final Jeopardy," and **no literal "Jeopardy" string exists anywhere in the app UI.** The mechanic (secret wager, timed clue, secret typed answers, dramatic reveal lowest-score-first) is generic enough to keep. You may keep the name "Final Round" or rename it to fit your concept. Give this screen strong hero-moment treatment either way.

---

## 4. Guardrails: what you must NOT break

**Keep internal identifiers and the database contract.** Rename only what users see. These are internal and touch the DB, Realtime, and content shape; renaming them is unnecessary for the brand and risky:
- The `dailyDouble` boolean field in [content/types.ts:6](content/types.ts#L6) and every pack that sets `dailyDouble: true`.
- DB columns and RPCs `dd_team_id`, `dd_wager`, `active_is_dd` in [supabase/schema.sql](supabase/schema.sql), [supabase/functions.sql](supabase/functions.sql), and [lib/types.ts](lib/types.ts).
- Event-type keys like `dd_correct` / `dd_wrong` (the map at [app/host/[code]/page.tsx:535-537](app/host/[code]/page.tsx#L535-L537) maps these keys to labels; change the **labels**, not the keys).

**Do not touch game logic or infrastructure:**
- Server-side buzz ordering and all Postgres functions in [supabase/functions.sql](supabase/functions.sql).
- The Realtime publication and table/column names (renaming a table silently breaks live updates).
- `localStorage` keys for host token and player identity in [lib/identity.ts](lib/identity.ts).
- `lib/useRoom.ts`, `lib/api.ts`, `lib/serverClock.ts`.
- The data invariant of exactly 6 categories by 5 ascending-value clues (`clueId` is derived from the value; packs and the board depend on it).

**Live-room constraints (this is what "projector-proof" means):**
- **Contrast:** category headers, clue text, and board values must be readable in a bright room from across it. High contrast on every surface. If a trendy low-contrast pairing tempts you, it fails here.
- **Tap targets:** the buzzer is the entire point of the app. Keep it huge. All player-facing controls at least ~48px.
- **Latency:** no animation or transition may gate the buzz result. The buzzed-team confirmation must render the instant state changes. The existing arming countdown (`buzzer_arms_at`) may be styled but not slowed.
- **Responsive:** the 6-column board must not overflow on a phone (the host also sees it on a laptop). Keep the existing responsive text sizing behavior.

---

## 5. Recon: read these before you start

- [tailwind.config.ts](tailwind.config.ts), [app/layout.tsx](app/layout.tsx), [app/globals.css](app/globals.css), [app/page.tsx](app/page.tsx) (the wordmark lives at [app/page.tsx:18](app/page.tsx#L18), metadata at [app/layout.tsx:8-11](app/layout.tsx#L8-L11)).
- Components: [components/Board.tsx](components/Board.tsx), [components/ClueView.tsx](components/ClueView.tsx), [components/Buzzer.tsx](components/Buzzer.tsx), [components/Leaderboard.tsx](components/Leaderboard.tsx), [components/Timer.tsx](components/Timer.tsx), [components/TeamJoin.tsx](components/TeamJoin.tsx), [components/QRJoin.tsx](components/QRJoin.tsx), [components/AnswerPeek.tsx](components/AnswerPeek.tsx), [components/Confetti.tsx](components/Confetti.tsx).
- Screens: [app/host/[code]/page.tsx](app/host/[code]/page.tsx), [app/board/[code]/page.tsx](app/board/[code]/page.tsx), [app/play/[code]/page.tsx](app/play/[code]/page.tsx), [app/host/page.tsx](app/host/page.tsx).
- [content/types.ts](content/types.ts) and the four packs in [content/packs/](content/packs/).
- The 🔔 bell is used as a generic buzzer mark (README title, buzz UI). It is not *Jeopardy*-specific; keep it or evolve it as part of your mark, your call.

---

## 6. Docs to update

- [README.md](README.md): title, the one-line description, and any body copy naming the brand or the renamed mechanic. Keep it accurate to the new identity. No em dashes, no tagline.
- App metadata and `themeColor` in [app/layout.tsx](app/layout.tsx).
- [BUILD_PLAN.md](BUILD_PLAN.md) is an internal historical build doc, never seen by users. It still contains literal "Jeopardy" references and the old hex codes, but **leave it alone**: the owner deletes it, and any other dead files, in a cleanup pass after your work lands. Do not treat it as a spec, and do not spend time scrubbing it.

---

## 7. Definition of done

Run these and report the results. The rebrand is complete when all pass.

**Build is clean:**
- `npm run build` succeeds (this also type-checks). Fix anything you broke.

**Trade dress is gone (each should return zero hits in `app/`, `components/`, `content/`, `lib/`, `tailwind.config.ts`; `BUILD_PLAN.md` may be excepted if you left it):**
- `rg -i '060CE9|040875|0510CE|FFCC00|D69F4C'`
- `rg 'DAILY DOUBLE|Daily Double'` (internal `dd_*` keys and the `dailyDouble` field are allowed; this checks user-facing labels)
- `rg 'answer:\s*"(What|Who|Where|When)\s+(is|are|was|were)'` in `content/packs/` (should be 0; was 124)
- `rg '\$\$\{'` in `app/` and `components/` (the hardcoded dollar renders; should be 0)
- confirm `fmtScore` in [lib/game.ts](lib/game.ts) no longer emits `$`
- `rg -i 'jeopardy'` (0, or only `BUILD_PLAN.md` if you kept it)
- `rg '—'` across the repo (0; enforces the no-em-dash rule)

**Identity is real, not a recolor:**
- `BRAND.md` exists with the concept, token table, type pairing, and motion notes.
- The name is chosen and applied to the wordmark, metadata, and README.
- If you can run the app, capture screenshots of the hero moments (landing, board, an open clue with the arming countdown, a buzz-in, the answer reveal, the renamed bonus splash, the final round, the winner). If you cannot run it, describe each screen's treatment in `BRAND.md`.

**Nothing critical moved:** you did not rename DB columns, tables, RPCs, `localStorage` keys, the `dailyDouble` field, or the 6x5 pack invariant; the Supabase files and `lib/` game plumbing are untouched except where this brief names them.

---

## 8. Suggested execution order

1. Recon (read section 5) and confirm the invariants in section 4.
2. Name + concept, then write `BRAND.md` with the full token system.
3. Implement tokens: swap hexes and fonts in [tailwind.config.ts](tailwind.config.ts) and [app/layout.tsx](app/layout.tsx) (fonts, `themeColor`, body background).
4. Reskin screen by screen, designing the hero moments: Board, ClueView, Buzzer, Leaderboard, then the host / board / play / landing screens.
5. Dollars to points: `fmtScore` plus the six hardcoded spots in section 3d.
6. Rename the "Daily Double" user-facing labels (section 3f); leave internals alone.
7. Content: convert the 124 answers out of question form and fix the type comment.
8. Docs: README + metadata (leave BUILD_PLAN.md alone; the owner deletes dead files in a later pass).
9. Verify: run every check in section 7 and report.

---

## 9. Committing your work

You have standing permission to `git commit` and `git push` whenever you need to (for example after the design system lands, after the reskin, after the content pass, after docs). You do not need to ask.

Commit rules, strictly:
- **Title only.** A single-line commit message. No body, no description.
- **No AI attribution.** Never add a `Co-Authored-By`, "Generated with", or any AI/tool trailer.
- **No em dashes** in the title (same rule as all copy).
- Keep it short, imperative, and specific. For example: `Rebrand palette and typography off Jeopardy blue`, or `Convert clue answers out of question form`.
