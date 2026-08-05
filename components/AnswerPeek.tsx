"use client";

import { useRef, useState } from "react";

// Privacy control. The host's laptop is often mirrored to the projector, so a
// plainly-printed answer is an answer on the wall. The text stays blurred until
// deliberately peeked: mouse hover, or press-and-hold on touch. The box never
// changes size on peek; a control bar that reflows on hover misplaces the ✓/✗
// buttons under the host's cursor.
//
// Implementation constraints, do not "simplify":
// - Pointer events with a pointerType guard, NOT onMouseEnter/onTouchStart.
//   After a tap, touch browsers dispatch a compatibility mouseenter that would
//   silently re-open the peek and leave the answer on the projector.
//   preventDefault cannot suppress it: React registers touchstart passively.
// - When onReveal is set this doubles as the reveal button: hold = private
//   peek, short press (< TAP_MS) = reveal to the room. A hold must NEVER count
//   as a tap, or lingering on the control publishes the answer.
const TAP_MS = 250;

export default function AnswerPeek({
  text,
  revealed = false,
  onReveal,
  className = "",
}: {
  text: string;
  revealed?: boolean;
  onReveal?: () => void;
  className?: string;
}) {
  const [peek, setPeek] = useState(false);
  const downAt = useRef<number | null>(null);

  const shown = revealed || peek;
  const canReveal = Boolean(onReveal) && !revealed;

  // Short press = reveal; anything longer was a peek and must not reveal.
  const endPress = () => {
    const held = downAt.current === null ? Infinity : Date.now() - downAt.current;
    downAt.current = null;
    setPeek(false);
    if (canReveal && held < TAP_MS) onReveal?.();
  };

  return (
    <div
      role={canReveal ? "button" : undefined}
      tabIndex={canReveal ? 0 : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setPeek(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") {
          downAt.current = null;
          setPeek(false);
        }
      }}
      onPointerDown={(e) => {
        downAt.current = Date.now();
        if (e.pointerType !== "mouse") setPeek(true);
      }}
      onPointerUp={endPress}
      onPointerCancel={() => {
        downAt.current = null;
        setPeek(false);
      }}
      onKeyDown={(e) => {
        if (canReveal && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onReveal?.();
        }
      }}
      className={`rounded-xl bg-white/10 border border-white/25 px-4 py-3 flex items-center gap-2 select-none ${
        canReveal ? "cursor-pointer hover:border-white/50" : "cursor-help"
      } ${className}`}
    >
      <span className="text-white/60 text-sm whitespace-nowrap leading-tight">
        {revealed ? "👁 Revealed" : canReveal ? "👁 Hold to peek · tap to reveal" : "👁 Hold to peek"}
      </span>
      <span className={`font-bold max-w-[36ch] transition ${shown ? "text-signal" : "blur-sm opacity-40"}`}>
        {text}
      </span>
    </div>
  );
}
