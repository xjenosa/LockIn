// Faint structural grid behind LockIn's calm screens (landing, lobbies, the
// results/champions view). Deliberately thin RULES, not the board's rounded
// tiles: a filled tile backdrop reads as a second, blurry jeopardy board when it
// sits behind or near the real one (components/Board.tsx), so this stays plain
// lines on a clearly different layer. Kept OFF the dense board / clue views.
//
// `values` mode (every calm grid screen): writes a faded board value (200..1000) inside
// each box. Per column the value climbs top -> bottom and wraps back to 200 after
// 1000; each column starts one row lower than the last, so equal values run on a
// diagonal. Evokes the board without a real one present, and stays line-based (no
// filled tiles), so the "second blurry board" concern never applies -- and it is
// never passed on a page that shows the actual Board. Bare values, no "$" glyph
// per BRAND.md.
//
// Placement contract: the host element must be `relative isolate overflow-hidden`.
// -z-10 drops the grid below in-flow content (so no content needs its own z-index);
// isolate traps that negative layer inside the host's stacking context, otherwise
// -z-10 sinks behind the page background and the grid vanishes.
//
// Pure decoration: pointer-events-none, aria-hidden, no motion.
const VALUES = ["200", "400", "600", "800", "1000"];
const COLS = 22; // sized to overflow past ultrawide; overflow-hidden clips the rest
const ROWS = 16;
const MASK = "radial-gradient(ellipse at 50% 45%, transparent 12%, black 64%)";

export default function GridBackdrop({ values = false }: { values?: boolean }) {
  if (values) {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 168px)`,
            gridAutoRows: "96px",
            color: "rgba(67,226,210,0.2)", // faded signal; this alpha is the noise-vs-visibility knob
            maskImage: MASK,
            WebkitMaskImage: MASK,
          }}
        >
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const col = i % COLS;
            const rowInGrid = Math.floor(i / COLS);
            const value = VALUES[(((rowInGrid - col) % 5) + 5) % 5];
            return (
              <div
                key={i}
                className="flex items-center justify-center border-b border-r border-white/[0.07] font-display text-xl"
              >
                {value}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "140px 76px",
        maskImage: "radial-gradient(ellipse at 50% 45%, transparent 20%, black 82%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, transparent 20%, black 82%)",
      }}
    />
  );
}
