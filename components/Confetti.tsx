"use client";

// CSS-only confetti (animate-fall keyframe): no dependency, no network.
// Deterministic positions/delays derived from the index, on purpose: random
// values would reshuffle every React re-render.
// animationFillMode "backwards" is load-bearing: it holds each piece at the
// first keyframe (translateY(-10vh), above the viewport) throughout its stagger
// delay. Without it the default fill-mode paints delayed pieces at their
// untransformed top:0 position, so they visibly hang at the top edge until the
// delay elapses, then drop.
const PIECES = ["🎉", "🎊", "⭐", "🏆", "✨"];

export default function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute animate-fall text-3xl"
          style={{
            left: `${(i * 41) % 100}%`,
            animationDelay: `${(i % 8) * 0.45}s`,
            animationDuration: `${3 + (i % 5) * 0.6}s`,
            animationFillMode: "backwards",
          }}
        >
          {PIECES[i % PIECES.length]}
        </span>
      ))}
    </div>
  );
}
