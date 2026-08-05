# Blare, the brand system

The design source of truth for this app. Every screen, color, font, and animation decision traces back to this file.

## 1. Name

Candidates considered:

| Name | Rationale | Wordmark direction |
|---|---|---|
| **Blare** (lead) | The sound of a horn at full volume, which is exactly what buzzing in feels like. Short, loud, verb and noun at once. No TV quiz association. | Heavy geometric caps in white, preceded by a teal beacon bar. No exclamation point, ever. |
| Pounce | The act of striking first. Kinetic and playful. | Rounded caps with a motion streak. |
| Klaxon | The alarm horn itself. Distinctive, but one letter from Klaxoon, an existing live team engagement product. Too close, rejected as lead. | Slanted industrial caps. |
| Faceoff | Team versus team showdown energy. | Split two-tone wordmark. |
| Airhorn | Maximum party energy, zero ambiguity. A bit jokey for a wordmark. | Stencil caps. |

**Chosen: Blare.** Fallback remains "Buzzer" if the owner overrules.

The wordmark is the word BLARE in Archivo Black caps, pure white, with a vertical teal "beacon" bar before it (a rounded rectangle, the light that switches on when buzzers open). No exclamation point: the loudest quiz brand on TV ends in one, so we never do. No tagline under it, per owner rule.

## 2. Concept and voice

Blare is a horn, not a quiz show. The room is dark, the board is a wall of quiet slate tiles, and everything that matters glows: teal when something is live, coral when something is at stake. The voice is a hype announcer who respects your time: short lines, present tense, second person ("You're first!", "Look up!").

Two-color logic carries the whole identity:

- **Teal = live.** Buzzers open, primary actions, scores, the answer.
- **Coral = stakes.** The Wildcard, wagers, Last Call, the clock running out is the only exception (that is loss red).

## 3. Color tokens

Defined in `tailwind.config.ts`. The old quiz-show tokens (board, boarddark, boardcell, gold, goldsoft) are deleted, not aliased.

| Token | Hex | Role | Contrast notes (approx.) |
|---|---|---|---|
| `ink` | `#0B0D12` | Page background, text on bright buttons | White on ink 18:1 |
| `stage` | `#111826` | Full-screen moment backdrop (clue view, splashes, sheets) | White on stage 16:1 |
| `tile` | `#1B2332` | Board cells, cards, idle buzzer | White on tile 14:1, signal on tile 9.8:1 |
| `signal` | `#25E6C4` | Brand primary: live states, CTAs, values, scores | On ink 12.2:1, ink text on signal 12.2:1 |
| `flare` | `#FF6A3D` | Stakes accent: Wildcard, wagers, Last Call | On stage 6.3:1 (large text only), ink text on flare 6.8:1 |
| `win` | `#2FD46D` | Correct adjudication, positive deltas | Ink text on win 10:1 |
| `loss` | `#F0335A` | Wrong adjudication, negative scores, urgent timer | On ink 4.9:1 (AA normal text), white on loss 3.9:1 (large/bold only) |

Team colors (`TEAM_COLORS` in `lib/game.ts`), eight vivid hues that read on ink and never collide with signal or flare roles:
`#FF5C5C` red, `#FF9E4D` orange, `#FFD166` amber, `#9BE857` lime, `#57E0FF` ice, `#5CB2FF` sky, `#B48CFF` violet, `#FF7AC1` pink.

Utility surfaces use white alpha steps: `white/[0.04]` resting, `white/[0.06]` card, `white/10` control, `white/15` border.

## 4. Typography

- **Display: Archivo Black** (single weight 400), loaded via next/font as `--font-display`. Wide, heavy, geometric. The deliberate opposite of a tall condensed quiz-show face. Used for: wordmark, board values, clue text, countdowns, scores, all display headings.
- **Body and UI: Space Grotesk** (variable), loaded as `--font-sans`. Techy without being cold. Used for everything else.

Case rules: clue text is sentence case (all-caps clues are the old show's tell, and sentence case reads faster from distance). Category names, eyebrows, and short labels are caps with wide tracking (`tracking-widest` or wider).

Projector floor: clue text `text-2xl` to `lg:text-6xl`, board values `text-xl` to `md:text-4xl`, all on surfaces of at least 9:1 contrast.

## 5. Spacing, radius, shadow

- Radius scale: `rounded-lg` board tiles and small controls, `rounded-xl` buttons and list rows, `rounded-2xl` cards, inputs, and CTAs, `rounded-3xl` the phone buzzer and hero sheets.
- Spacing: existing Tailwind steps, gaps of 1.5 to 2 inside the board grid, `p-4` to `p-6` page gutters.
- Shadows are glows, not drops: a live element may carry `animate-pulseglow` (teal box glow) or a `glow-signal` or `glow-flare` text glow from `globals.css`. Nothing else casts shadows; depth comes from surface steps.

## 6. Motion vocabulary

Three moves, nothing over 400ms except ambient loops:

1. **pop** (350ms, existing): things arrive. Buzz-in card, countdown digits, reveals, winner name.
2. **pulseglow** (1.2s loop, recolored teal): things are live. Open buzzer button, armed phone buzzer.
3. **fall** (3.5s loop, existing): confetti at the end.

Hard rule: no animation between tap and result. The buzz verdict renders the instant state changes; pop only animates the element that is already showing the result. The arming countdown is styled but never lengthened.

## 7. Screen treatments

- **Landing**: ink page, faint teal radial glow from the top. Beacon bar plus BLARE wordmark, room code input in wide-tracked display caps, one teal CTA. Host link is quiet text underneath.
- **Lobby (host and projector)**: wordmark small, white QR card with a soft teal ring, room code in signal display caps, team chips popping in with their team colors.
- **Board**: 6x5 grid of slate tiles on ink. Category row: white caps on `white/[0.04]` with a small teal bar under each name. Values in signal display type. Played tiles fade to near-invisible slate. Active tile rings signal. The just-played column dims with a "just played" note.
- **Clue view**: full-screen stage with a faint teal glow from the top. Category eyebrow and value up top, clue in big white sentence-case display type. Arming: "GET READY" eyebrow and a giant signal digit popping each second. Open: "BUZZERS LIVE" pulsing in signal.
- **Buzz-in**: the loudest thing in the room. A white card pops in with a thick team-color border, a siren emoji, team and player name in ink. Renders the instant the server verdict lands.
- **Answer reveal**: the answer pops in below the clue in signal display type with a teal text glow.
- **Wildcard splash** (the secret-wager bonus clue): stage flooded with a coral radial glow, WILDCARD! in flare display caps with a flare glow, wager form on a quiet card, lock button in flare.
- **Phone buzzer**: one giant rounded-3xl button. Idle slate "Wait for it", white GET READY with the countdown, then full signal teal BLARE! with the teal pulse glow. Winner state flips to signal with "YOU'RE FIRST!". Locked out is dim loss red. Wildcard state is flare: "Look up!".
- **Last Call** (the endgame wager round): every phase of it is flare-coded. Host and projector show a LAST CALL eyebrow in flare, wagers render in flare, the reveal runs on quiet cards with signal for the reveal action and win/loss for judgment.
- **Winner**: confetti falls, CHAMPIONS eyebrow in signal, winner name pops in their team color.

## 8. Do not

- No royal blue, no gold, no dollar signs, no all-caps clue text, no answer phrased as a question.
- No exclamation point in the wordmark. No tagline. No em dashes anywhere.
- No low-contrast pairings on projector surfaces. If a color fails 4.5:1 at body size on its surface, it is display-size only or it does not ship.
- No animation on the buzz path. Ever.
