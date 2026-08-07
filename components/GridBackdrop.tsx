// Faint structural grid behind LockIn's calm screens (landing, lobbies, the
// results/champions view). Deliberately thin RULES, not the board's rounded
// tiles: a filled squircle-tile backdrop reads as a second, blurry jeopardy
// board when it sits behind or near the real one (components/Board.tsx), so this
// stays plain lines on a clearly different layer. Kept OFF the dense board / clue
// views on purpose.
//
// Placement contract: the host element must be `relative isolate overflow-hidden`.
// -z-10 drops the grid below in-flow content (so no content needs its own z-index);
// isolate traps that negative layer inside the host's stacking context, otherwise
// -z-10 sinks behind the page background and the grid vanishes.
//
// Pure decoration: pointer-events-none, aria-hidden, no motion. Grid + mask live
// in inline style (the radial-gradient commas and the WebKit mask prefix are more
// reliable there than as Tailwind arbitrary values).
export default function GridBackdrop() {
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
