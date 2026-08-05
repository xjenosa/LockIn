"use client";

// CSS-only confetti (animate-fall keyframe): no dependency, no network.
// Deterministic positions/delays derived from the index, on purpose: random
// values would reshuffle every React re-render.
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
          }}
        >
          {PIECES[i % PIECES.length]}
        </span>
      ))}
    </div>
  );
}
