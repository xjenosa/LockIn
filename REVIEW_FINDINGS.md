# Review findings — NOT YET APPLIED

Produced by the adversarial review phase of workflow `wf_56363fae-bdc`.
The fix agent **failed on the session limit before applying any of these**, so every item below is still present in the code.

Build state at time of review: `tsc --noEmit` and `npm run build` both pass. These are runtime/logic defects, not compile errors.

Note: the client-UX lens verification pass also died on the limit, so findings in `Buzzer.tsx` / `play page` / `TeamJoin.tsx` / `ClueView.tsx` are **unverified** — confirm before fixing.

---

## [HIGH] update_player authenticates the caller only by p_player_id, which is publicly readable — any client can re-team or rename any player in any room

**File:** `supabase/functions.sql:178`

**Fails when:** update_player looks the player up with `select pl.* into v_player from players pl where pl.id = p_player_id` and never checks that the caller IS that player, nor that the caller is even in the same room — the room is derived from the victim (functions.sql:180). player ids are not secret: schema.sql:108 grants `public read players ... using (true)` and lib/useRoom.ts does `supabase.from("players").select("*")`, so every phone already holds every other player's UUID, and an unfiltered anon-key query returns players for every live room on the project. Concrete: during phase='playing', a player runs `supabase.rpc('update_player', { p_player_id: <rival's id>, p_team_id: <my team id> })`. The rival's players.team_id now points at the attacker's team. claim_buzz resolves the buzzing team server-side from `players join teams` (functions.sql:244-246), so the rival's next buzz is announced as the attacker's team and the host's ✓ awards those points to the attacker. Same call in phase='lobby' additionally deletes the rival's now-empty team via the cleanup at functions.sql:218-223 (cascading its final_submissions/score_events rows). None of this requires the room code — the attacker can enumerate and grief every concurrent room from one session with the anon key that ships in the JS bundle.

**Suggested fix:** Authenticate the player the way hosts are authenticated. Add a `player_secrets(player_id uuid primary key references players(id) on delete cascade, token uuid unique not null default gen_random_uuid())` table with RLS on and no policies, return the token from join_room, store it in localStorage alongside player_id (lib/identity.ts), and change the signature to `update_player(p_player_token uuid, ...)` resolving the player by token. If a token is too much churn for this game, at minimum add a `p_code text` argument and `raise exception 'PLAYER_NOT_FOUND'` when `v_room.code <> upper(trim(p_code))` — that removes the cross-room reach but leaves same-room impersonation open. Mirror the change into supabase/migrations/001_playtest_fixes.sql:107 and lib/api.ts's updatePlayer wrapper.

---

## [HIGH] update_player has no phase or round-state guard, so team membership — the only ACL protecting final_submissions and the buzzer lockout — is player-editable mid-round

**File:** `supabase/functions.sql:183`

**Fails when:** The p_team_id branch accepts a team change in every phase; the only state check in the function is `v_room.phase = 'lobby'` on the *cleanup* at line 218, never on the move itself. Two concrete exploits, both reachable from the shipped UI with no devtools, because app/play/[code]/page.tsx renders the ✏️ edit sheet inside `header`, which is passed to every phase including FinalPhone (line 190). (a) Final-round disclosure: in phase='final_wager' the attacker taps ✏️, selects the rival team, saves. When the host advances to final_clue, FinalPhone remounts (key={room.phase}) and its `getMyFinal(playerId)` effect (app/play/[code]/page.tsx:257-265) returns the RIVAL team's secret wager and answer, prefilled in the textarea; submitFinal then overwrites that rival's answer, since submit_final also scopes by players.team_id. final_submissions is given NO select policy (schema.sql:53-61) precisely to stop this, but get_my_final/submit_final key off players.team_id, which update_player just let the attacker change. (b) Lockout dodge: after host_reopen_after_miss appends team A to locked_out_team_ids (functions.sql:419), the team A player switches to team B in the edit sheet and buzzes — claim_buzz tests the lockout against the freshly resolved team (functions.sql:255), so they steal the clue they just got wrong, then switch back.

**Suggested fix:** Gate the team change on room state while still allowing a name-only edit at any time: in the `p_team_id` / `p_new_team_name` branches, `if v_room.phase <> 'lobby' then raise exception 'TEAM_LOCKED'; end if;` (or, if mid-game switching must stay allowed, at least block it when `v_room.active_clue_id is not null or v_room.phase in ('final_wager','final_clue')`). Mid-game moves then go through host_move_player, which is already token-guarded. Add TEAM_LOCKED to the FRIENDLY map in components/TeamJoin.tsx and mirror into supabase/migrations/001_playtest_fixes.sql:128.

---

## [HIGH] A server-rejected buzz latches localBuzzed, disabling the player's button for the rest of the clue

**File:** `components/Buzzer.tsx:63`

**Fails when:** buzz() sets localBuzzed=true (line 59) and then fires `void claimBuzz(...)` (line 63), discarding the `{won}` result. Before the arming change the only ways to lose were "someone else won" or "locked out", both of which mutate `rooms` and re-render the button into a correct terminal state. The new `now() >= buzzer_arms_at` guard adds a third failure mode that changes NOTHING in `rooms`: the tap is silently dropped server-side. The re-arm effect's key `${active_clue_id}:${buzzer_open}:${buzzed_team_id}` (line 26) is therefore unchanged, localBuzzed stays true, and `canBuzz` (line 53) is false for the remainder of the clue. Concretely: host opens buzzers on c3-800 at T (arms at T+3.0s); player P's phone paints an enabled green BUZZ for one frame at ~T+0.4s (see the separate armsIn finding) and P's mashing thumb lands a pointerdown; claim_buzz returns won=false because now() < arms_at. At T+3.0s every other phone turns green; P's shows "…" and `disabled`, and P cannot buzz at all for that clue. No error, no retry path. P only recovers on the next open or steal reopen.

**Suggested fix:** Stop discarding the RPC result: `void claimBuzz(room.code, playerId, room.active_clue_id).then((r) => { if (!r?.won) setLocalBuzzed(false); }).catch(() => setLocalBuzzed(false));`. Clearing on won=false is safe for the other two loss modes — if another team genuinely won, `!room.buzzed_team_id` in canBuzz already blocks the button, and a lockout is blocked by `lockedOut`.

---

## [HIGH] armsIn is effect-state, so the first render after buzzer_arms_at arrives commits an enabled "BUZZ!" button

**File:** `components/Buzzer.tsx:21`

**Fails when:** While the clue is open but the buzzer is shut, `buzzer_arms_at` is null, so the effect at line 36 has set `armsIn = 0`. When useRoom delivers the row with `buzzer_open=true, buzzer_arms_at=T+3s`, React renders with the still-stale `armsIn = 0`: `arming` (line 52) is false and `canBuzz` (line 53) is TRUE, so the DOM is committed with `disabled={false}`, the green `bg-green-500 animate-pulseglow` class and the label "BUZZ!". The passive effect that sets armsIn≈2600 is flushed by React 18's scheduler in a later macrotask, so any pointerdown dispatched between the commit and that flush hits an enabled button and runs buzz(). That is precisely the mashing tap the 3-second window was added to stop — and because claim_buzz rejects it (arms_at is still ~2.6s away), the player lands in the localBuzzed-latch defect above and loses the whole clue. This fires on every buzzer open and every steal reopen, for every player whose localBuzzed is currently false. Same pattern in components/ClueView.tsx line 48, where the cost is only cosmetic (projector flashes "Buzzers open!" for a frame before "Get ready… 3").

**Suggested fix:** Derive the gate during render instead of storing it in an effect. Keep only a ticking counter in state and compute the value inline: `const [, setTick] = useState(0); useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 100); return () => clearInterval(id); }, [room.buzzer_arms_at]); const armsIn = room.buzzer_arms_at ? Math.max(0, Date.parse(room.buzzer_arms_at) - Date.now()) : 0;` — the very first render that sees a new buzzer_arms_at is then already ~3000 and the button is never committed enabled. Apply the same shape to ClueView's armLeft.

---

## [HIGH] A rejected or failed buzz permanently disables the buzzer for that player for the rest of the clue

**File:** `components/Buzzer.tsx:63`

**Fails when:** `buzz()` sets `localBuzzed = true` optimistically and then discards the RPC result (`void claimBuzz(...)`, no `.then`, no `.catch`). Nothing resets `localBuzzed` except the key effect on line 25, which only fires when `active_clue_id`/`buzzer_open`/`buzzed_team_id` changes — a refused claim changes none of them. Three concrete ways to hit it: (1) `armsIn` is React state initialised to 0 and only written by the effect on line 36, which runs after paint, so the frame in which `buzzer_open` flips true renders `canBuzz === true` and paints a live green BUZZ button with `disabled={false}`; same on a fresh mount/reload/wake during the 3s window. (2) Any phone whose clock is a few hundred ms ahead of the Postgres clock reaches `armsIn <= 0` before `now() >= buzzer_arms_at`, and the players are by design mashing the button the instant it turns green. (3) A transient fetch failure on party wifi. In all three the room row is unchanged, so the player's button falls to the `localBuzzed && room.buzzer_open` branch and reads "…" (green, looks like a pending buzz) while `canBuzz` stays false — they cannot buzz for the whole clue. That directly violates "early taps ignored with NO penalty"; the tap costs them the clue.

**Suggested fix:** Use the RPC result: `void claimBuzz(...).then((r) => { if (!r?.won) setLocalBuzzed(false); }).catch(() => setLocalBuzzed(false));`. Clearing on a non-win is safe because the other loss modes are already covered by room state (`buzzedTeam`, `lockedOut`, `weWon`) and re-disable the button independently. Additionally compute `armsIn` during render (`room.buzzer_arms_at ? Math.max(0, Date.parse(room.buzzer_arms_at) - Date.now()) : 0`, with the interval only forcing a re-render) so the first painted frame is never wrongly armed.

---

## [HIGH] Edit sheet's top (name field and ✕) is unreachable — flex end/center alignment inside an overflow-y-auto container

**File:** `app/play/[code]/page.tsx:125`

**Fails when:** The overlay is `fixed inset-0 overflow-y-auto flex items-end sm:items-center`. When the modal is taller than the viewport, `align-items: end|center` pushes the overflow past the container's block-START edge, and start-direction overflow is not part of the scrollable overflow region — scrollHeight stays == clientHeight, so the container does not scroll at all and the clipped top is permanently unreachable. The modal measures ~610-670px (p-4 overlay + p-5 card + h2 + name label/input ~86px + mode buttons 50px + team list up to max-h-56 = 224px + Save 64px + Cancel 48px + four space-y-5 gaps). On an iPhone SE / 13 mini in portrait (~550px of visible fixed-viewport) with 3-4 teams, and on ANY phone in landscape (height ~390px, width ≥640 so `sm:items-center` applies), the "Name & team" heading, the ✕ close button and the entire "Your name" input are cut off with no way to scroll to them. The headline fix for playtest bug #1 — letting a player change their name — is unusable on those devices.

**Suggested fix:** Drop the flex centering on the scroll container and use auto margins or block layout instead, e.g. `fixed inset-0 z-50 bg-black/70 overflow-y-auto p-4` with the inner card as `w-full max-w-md mx-auto my-auto` inside a `min-h-full flex flex-col justify-end sm:justify-center` wrapper, or simply `sm:my-8` + `mt-auto`. The rule: the scroll container must never align its child to end/center when the child can exceed the viewport.

---

## [MEDIUM] host_close_clue rotates the turn unconditionally, so a duplicate close silently skips a team

**File:** `supabase/functions.sql:529`

**Fails when:** Ring is [Alpha, Bravo, Charlie], control_team_id = Alpha. Alpha buzzes and answers correctly, host clicks "✓ Correct" — app/host/[code]/page.tsx:259-266 fires hostAward(...).then(() => hostCloseClue(t)). The ClueView overlay stays mounted until the realtime round-trip lands (useRoom debounces 60ms then re-fetches rooms+teams+players, so ~300ms-1s after the click), and its "← Back to board" button (components/ClueView.tsx:257) has no disabled/in-flight state. The host, seeing nothing happen, clicks it — or simply double-clicks "← Back to board" at the end of any clue, which is a single trackpad gesture. Two host_close_clue calls run, each doing an unconditional `perform _advance_control(v_room.id)`, and control goes Alpha → Bravo → Charlie. Bravo never gets the pick — exactly the "a team never picks" failure the rotation was added to fix, and it happens silently with no log entry. This is a new regression: the pre-change host_close_clue (git HEAD supabase/functions.sql) did no rotation, so repeated calls were harmless. Mirrored at supabase/migrations/001_playtest_fixes.sql:411.

**Suggested fix:** Make the rotation idempotent by gating it on there having actually been an open clue. v_room is the pre-UPDATE snapshot already read under `for update`, so: `if v_room.active_clue_id is not null then perform _advance_control(v_room.id); end if;` — the second call sees a null active_clue_id and does not rotate. Apply the same edit in supabase/migrations/001_playtest_fixes.sql:411. Optionally also give ClueView's close/✓ buttons a local in-flight disabled state.

---

## [MEDIUM] Undoing an old 'miss' lifts that team's lockout on whatever clue is live right now

**File:** `supabase/functions.sql:470`

**Fails when:** host_undo_event removes the team from locked_out_team_ids unconditionally for any 'miss' event, without checking that the event's clue_id is the room's currently-active clue. Concrete trace: (1) Clue c1-600, Team A buzzes and is judged wrong -> host_reopen_after_miss logs miss#1 (clue c1-600) and locks out A. (2) Team B steals, host closes the clue -> locked_out_team_ids resets to '{}'. (3) Clue c3-800 opens, Team A buzzes and is legitimately wrong -> miss#2 logged, locked_out_team_ids = {A}, buzzer reopened for steals. (4) The host now looks up the c1-600 answer, realises the FIRST ruling was wrong, scrolls the history panel and clicks the X on miss#1. host_undo_event refunds A's $600 (correct) and then runs `array_remove(locked_out_team_ids, A)` against the CURRENT room row, wiping A's lockout on c3-800. Team A can immediately re-buzz and steal the clue they were just correctly ruled wrong on, with the host seeing no indication anything changed. Same code is mirrored in supabase/migrations/001_playtest_fixes.sql:352.

**Suggested fix:** Gate the lockout lift on the event belonging to the live clue: `if v_ev.reason = 'miss' and v_ev.clue_id is not distinct from v_room.active_clue_id then ... end if;` (v_room is already fetched under the room's FOR UPDATE lock, so active_clue_id is current). Apply the identical change in supabase/migrations/001_playtest_fixes.sql.

---

## [MEDIUM] Final-round scoring can never be undone — ScoreHistory only mounts in the 'playing' phase

**File:** `app/host/[code]/page.tsx:243`

**Fails when:** <ScoreHistory> is rendered only inside `if (room.phase === "playing")`. The final_reveal branch awards +/- the wager via hostAward(..., "final", ...) at lines 366 and 376, and immediately advances revealIdx so the card is gone. There is no path from final_reveal or results back to 'playing' (BackToBoardButton exists only on the final_wager screen), so the panel can never be reached again. Concrete trace: the last team wagered their whole $5,000, answered correctly, the host misreads it and taps the red X -> hostAward(-5000, reason 'final') commits, revealIdx advances, the card disappears. The event IS in score_events and IS undoable by the RPC, but no UI in the app can reach it. The wrong team is crowned champion and the only recovery is host_reset_game, which wipes the whole game. This is the highest-stakes judgement call in the match and it is the one place the undo feature does not cover — note REASON_TEXT at line 462 already maps `final: "Final Round"`, dead code that shows the rows were intended to render.

**Suggested fix:** Render <ScoreHistory pack={pack} log={log} onUndo={...} /> in the final_reveal and results branches too (it is already host-only and the effect at line 72 keeps `log` fresh in every non-lobby phase). Undoing a 'final' row correctly reverses the score, and the reveal card being gone doesn't matter because the label already reads "Final Round ✓/✗".

---

## [MEDIUM] Arming gate compares Postgres now() against the phone's Date.now(), so a skewed device clock silently locks a player out (or lets them tap early)

**File:** `components/Buzzer.tsx:42`

**Fails when:** `buzzer_arms_at` is a server timestamp but line 42 measures it against the device clock (`at - Date.now()`), and canBuzz hard-gates on `armsIn <= 0`. Slow-clock direction: a phone whose clock is 4s behind the DB gets `buzzer_arms_at = 12:00:03`, computes armsIn ≈ 7000 on arrival, renders "GET READY 7" and keeps the button `disabled` until its own clock reads 12:00:03 — four real seconds AFTER the buzzer went live and every other team could buzz. That player loses every buzz on every clue and every steal all game, with nothing on screen indicating anything is wrong. Fast-clock direction: the button enables before the server will accept, producing the silently-eaten buzz in the localBuzzed finding. Before this change the button armed the instant `buzzer_open` arrived over the wire and no client clock was consulted, so this is a regression in the fairness of the race. Timer.tsx line 30 inherits the same skew — its new `Date.now() < start` gate keeps the answer clock hidden for the full skew interval on a slow host laptop.

**Suggested fix:** Measure the offset once and apply it everywhere a server timestamp is compared to local time. Cheapest dependency-free version: add a trivial `create function server_now() returns timestamptz ... select now()` RPC (or return `now()` as a fourth column from claim_buzz), call it once in useRoom, store `skew = serverNow - Date.now()`, and use `at - (Date.now() + skew)` in Buzzer, ClueView and Timer. If you'd rather not touch the DB, at least bound the slow-clock case by clamping the drawn countdown to a shared ARM_SECONDS constant measured from the moment the client first observed that particular buzzer_arms_at value.

---

## [MEDIUM] Re-arm key can be identical across a steal reopen, freezing a player out of the steal window

**File:** `components/Buzzer.tsx:26`

**Fails when:** The key is `${active_clue_id}:${buzzer_open}:${buzzed_team_id}`, which is the SAME string before a buzz and after a steal reopen (`C:true:null` both times). The localBuzzed reset only happens because the client is assumed to observe the intermediate `C:true:<winnerId>`. useRoom coalesces bursts into a single refetch (60ms debounce) and falls back to a 5s poll whenever Realtime is unavailable — a mode the hook explicitly supports — so that intermediate value can be skipped entirely. Concretely with Realtime down: buzzers open at T; P's poll at T+2 records key `C:true:null`; P taps at T+4 (localBuzzed=true) and loses to team A at T+4.1; the host judges A wrong at T+6.5, which nulls buzzed_team_id and stamps a fresh buzzer_arms_at; P's next poll at T+7 returns `C:true:null` — byte-identical to lastClue.current — so localBuzzed is never cleared. P's phone counts down the new arming window (GET READY 3, 2, 1, because arming reads buzzer_arms_at, not the key) and then falls through to "…" `disabled`, so it visibly counts P in and then refuses the buzz for the entire steal. Same outcome if P's tab is backgrounded/throttled across the buzz-to-reopen window and refetches on visibilitychange.

**Suggested fix:** Key the re-arm on buzzer_arms_at, which is stamped fresh by both host_open_buzzer and host_reopen_after_miss and can never be skipped because it is part of the terminal state: `const key = `${room.active_clue_id}:${room.buzzer_open}:${room.buzzer_arms_at}`;` (adding room.buzzer_arms_at to the dep array). Every arm then clears localBuzzed regardless of which intermediate rows the client saw.

---

## [MEDIUM] host_reopen_after_miss reopens the buzzers without clearing answer_revealed, so the steal round runs with the answer on the projector

**File:** `supabase/functions.sql:418`

**Fails when:** The update sets `buzzer_open = true` and a fresh `buzzer_arms_at` but leaves `answer_revealed` untouched, and ClueView's host control bar renders the ✓/✗ buttons purely on `buzzedTeam` being non-null (line 226) with no `answer_revealed` guard. So: team A buzzes on Elements $600 and says "aluminium"; the host clicks "👁 Reveal answer" to show the room why that's wrong (answer_revealed=true, buzzer_open=false, and ClueView line 148 paints "Gold" in big gold text on the projector); the host then clicks "✗ Wrong (−$600, others can steal)", which is still on screen. host_reopen_after_miss docks A, locks A out, and reopens the buzzers with a 3s arm — while `answer_revealed` is still true and "Gold" is still rendered on the board. Every phone counts GET READY 3, 2, 1 and team B buzzes to read the answer straight off the screen for +$600. Same code path mirrored at supabase/migrations/001_playtest_fixes.sql line 300.

**Suggested fix:** Add `answer_revealed = false` to the `update rooms set` in host_reopen_after_miss (both functions.sql and the migration) — reopening for a steal must put the answer back under wraps. Optionally also gate ClueView's ✓/✗ block on `!room.answer_revealed` so the host can't adjudicate into a revealed state at all.

---

## [MEDIUM] Hover-to-peek sticks open after a tap on a touchscreen host, leaking the answer to the room

**File:** `components/ClueView.tsx:196`

**Fails when:** `onTouchStart` sets `peek(true)` and `onTouchEnd` sets it false, but the handlers never `preventDefault()`. After a tap, every touch browser (iOS Safari, Chrome on Android and on Windows touchscreens) dispatches the compatibility mouse sequence — mouseover, **mouseenter**, mousemove, mousedown, mouseup, click — AFTER touchend. That synthesised mouseenter re-fires `onMouseEnter` and sets `peek` back to true, and no mouseleave arrives until the host next taps somewhere else. So on the exact setup this feature exists for (host laptop = projected screen, and touchscreen laptops/Surface/iPad are common), a quick tap on the peek box leaves `clue.answer` unblurred in gold on the projected screen indefinitely while the buzzed team is still answering — the precise leak bug #4 was meant to close.

**Suggested fix:** Call `e.preventDefault()` in `onTouchStart` (suppresses the compat mouse events) and keep the touch handlers as press-and-hold, or drive the whole thing from pointer events with `pointerType` awareness: `onPointerDown`/`onPointerUp`/`onPointerCancel` plus `onPointerEnter`/`onPointerLeave` guarded by `e.pointerType === "mouse"`.

---

## [MEDIUM] Final Round clue screen prints the correct answer in plain text on the host (= projected) screen

**File:** `app/host/[code]/page.tsx:324`

**Fails when:** The `final_clue` branch renders `Answer: {pack.final.answer}` as static text under the timer, and `final_reveal` renders `Correct response: {pack.final.answer}` in gold. The hover-to-peek treatment was applied only inside ClueView's control bar. Under the stated premise that the host's laptop IS the projected screen, every team reads the Final Round answer for the full 60 seconds while they are typing their responses on their phones — a strictly worse leak than the dim board-answer line that was just removed, and it decides the game. (Pre-existing code, but it is the same class of bug this change set out to eliminate and it sits in one of the audited files.)

**Suggested fix:** Wrap both spans in the same hover-to-peek box used in ClueView (extract it into a small `AnswerPeek({ text })` component and use it in ClueView, `final_clue` and `final_reveal`), so the final answer is blurred until the host hovers.

---

## [MEDIUM] No undo affordance anywhere in the Final Round — a mis-tapped ✓/✗ is unrecoverable

**File:** `app/host/[code]/page.tsx:375`

**Fails when:** `ScoreHistory` is only rendered inside the `phase === "playing"` branch (line 243). In `final_reveal` the host taps ✓ or ✗, which fires `hostAward(..., "final", ...)` and immediately increments `revealIdx`; there is no back button in that branch and no way to return to `playing` (only `final_wager` has a `BackToBoardButton`), and the `results` screen has no log either. So a mis-tap on ✗ costs a team twice their wager — the largest swing in the game — with no undo, no re-judge and no manual adjustment UI. The event IS in `score_events` and `hostUndoEvent` would reverse it; only the UI is missing. This leaves playtest bug #5 ("a misjudgement is permanent") unfixed exactly where the stakes are highest.

**Suggested fix:** Render `<ScoreHistory pack={pack} log={log} onUndo={...} />` in the `final_reveal` and `results` branches too (the log effect already runs in every non-lobby phase), and/or add a "← previous team" button that does `setRevealIdx(i => Math.max(0, i - 1))`.

---

## [MEDIUM] Switching team from the edit sheet during the Final Round silently overwrites the destination team's wager/answer

**File:** `app/play/[code]/page.tsx:137`

**Fails when:** `header` (with the ✏️ button and the edit sheet) is passed into `FinalPhone` and rendered in every phase, and `update_player` has no phase guard. `FinalPhone` loads the team's submission once in an effect keyed on `[playerId, phase]` (line 264), so a team change does not refresh it. Concrete: during `final_wager`, Player X on Team A realises they are on the wrong team, taps ✏️ and switches to Team B (which already locked a wager of 3000). X's input still shows Team A's 200. X taps "Lock wager 🔒" → `submitFinal(playerId, 200, null)` resolves X's CURRENT team server-side and overwrites Team B's row — Team B silently loses its wager with no indication on any screen. The same switch also lets a player read another team's secret wager/answer after a reload, and mid-clue it bypasses the steal lockout (`locked_out_team_ids` holds the old team, so the hopped player can buzz again for the steal they were just locked out of).

**Suggested fix:** Restrict the sheet by phase: when `room.phase` is `final_wager`/`final_clue`/`final_reveal` (and ideally while `room.active_clue_id` is non-null), render only the name field and hide the team switcher — pass a `nameOnly` prop to `TeamJoin` and send `teamId: undefined` so `update_player` takes its name-only branch. At minimum, refetch `getMyFinal` when the team changes so the phone never posts the previous team's answer.

---

## [LOW] Host "Skip turn →" button names and hands the pick to the wrong team when someone joins mid-game

**File:** `app/host/[code]/page.tsx:171`

**Fails when:** Game starts with Alpha, Bravo, Charlie, so pick_order = [Alpha, Bravo, Charlie]. Two clues later control_team_id = Charlie (the last ring element). A latecomer joins and creates team Delta: Delta shows up in `teams` immediately via realtime, but _advance_control only appends it to pick_order on the NEXT host_close_clue. The banner computes nextPickId = ring[(ring.indexOf("Charlie") + 1) % 3] = ring[0] = Alpha and renders "Skip turn → Alpha". Two divergences follow: (a) if the host just plays and closes the clue, the server appends Delta first and hands control to Delta, so the button was labelled with the wrong team; (b) if the host presses the button, control jumps to Alpha and Delta is skipped for the entire cycle. The client applies no append rule; the server (supabase/functions.sql:46-50) appends before rotating.

**Suggested fix:** Mirror the server's prune+append rule before indexing. `teams` already arrives ordered by created_at from useRoom, so: const ring = [...(room.pick_order ?? []).filter((id) => teams.some((t) => t.id === id)), ...teams.filter((t) => !(room.pick_order ?? []).includes(t.id)).map((t) => t.id)]; then take nextPickId from that effective ring.

---

## [LOW] Host turn banner — and the only hostSetControl override UI — disappears entirely when control_team_id is null

**File:** `app/host/[code]/page.tsx:196`

**Fails when:** A room that was mid-game when 001_playtest_fixes.sql was applied has pick_order = '{}' (backfilled default) and, if nobody had answered correctly yet, control_team_id = null — the pre-change host_start_game never set it (git HEAD supabase/functions.sql:180-187 is just `update rooms set phase = 'playing'`). On /host the whole `{controlTeam && (...)}` block is skipped, so there is no "X picks next" line AND no per-team chips — those chips are the only UI in the app that calls hostSetControl. The host has no way to seed the rotation and must open and close an arbitrary clue; _advance_control then hits the null-control fallback (functions.sql:58 falls back to the stored pick_index of 0, then +1), landing the ring on the SECOND team and skipping the first. Meanwhile /board/[code] degrades correctly to "Host picks next", so the projector and the host disagree about whether anything is wrong.

**Suggested fix:** Render the banner whenever phase === "playing" && teams.length > 0, using controlTeam only for the colour styling and the headline: when controlTeam is null show something like "No team has the pick yet — tap a team" with the same chip row, so hostSetControl stays reachable and the host can bootstrap the ring in one click.

---

## [LOW] Award paths never call refreshLog, so the history panel is a full row behind right after an award

**File:** `app/host/[code]/page.tsx:72`

**Fails when:** onUndo does `hostUndoEvent(t, id).then(refreshLog)` (line 246), but onCorrect/onWrong (lines 259, 270, 279) do not — they rely on the effect at line 72 firing off `scoreKey`/`revealedCount`, which only change after a realtime postgres_changes push, useRoom's 60ms scheduleRefetch debounce, a full fetchAll round trip, and then a second round trip for host_get_score_log. On venue Wi-Fi that is easily 300-800ms, and up to 5s if Realtime is unavailable and useRoom falls back to its 5s poll. During that window the panel's top row is still the PREVIOUS event while the ClueView has already unmounted and drawn the host's eye to the panel; clicking the top X undoes the earlier award instead of the one just made (e.g. host awards Team A +$600, immediately regrets it, clicks the top X, and Team B loses the $400 from the prior clue while Team A keeps the $600). There is also a case where the effect never fires at all: a Daily Double locked at wager 0 (ClueView line 109 yields w=0 from an empty input) judged wrong calls hostAward(delta 0, 'dd_wrong') then hostRevealAnswer — score unchanged, clue not closed, phase unchanged — so the row does not appear until the next unrelated scoring action. A secondary symptom of the same wiring: the log GET issued by the effect can be in flight when an undo commits and resolve after refreshLog's GET, briefly restoring the X on an already-reversed row.

**Suggested fix:** Call refreshLog from the award handlers the same way undo does: `.then(() => hostCloseClue(t)).then(refreshLog)` on onCorrect, `.then(() => hostRevealAnswer(t)).then(refreshLog)` on the DD-wrong branch, and `void hostReopenAfterMiss(t, penalty).then(refreshLog)` on the miss branch. That removes the realtime dependency for the panel's freshness and closes the delta-0 gap.

---

## [LOW] Auto-defaulting to "join" yanks the first player out of the Create form mid-typing

**File:** `components/TeamJoin.tsx:56`

**Fails when:** The effect runs on every `teams.length` change, not just the initial 0 → n hydration: `if (!modeTouched.current && teams.length) setMode("join")`. `modeTouched` is only set by tapping a mode button, so the very first player — who lands on "Create a team" by default because `teams` was empty and therefore never taps it — is switched to "Join a team" the moment anyone else's team arrives over realtime. Concrete: everyone scans the QR at once; Player A types "Git Blamers" into the team-name field; Player B creates "Bug Hunters"; A's form is replaced by the team list, the keyboard closes and the typed name disappears from view; A taps "Let's go! 🚀" and gets "Pick a team to join!". Recoverable (the typed name is still in state behind the Create tab), but it is exactly the deliberate-choice case the fix was supposed to respect.

**Suggested fix:** Only auto-default on the first arrival of teams, e.g. gate the effect on a ref that latches after the first non-empty `teams` (`if (!modeTouched.current && teams.length && !seeded.current) { seeded.current = true; setMode("join"); }`), or treat a non-empty `teamName` as touched.

---

