"use client";

import { useRef, useState } from "react";

// The host's laptop IS the projected screen, so any answer printed on it is an
// answer on the wall. This keeps one blurred until the host asks for it: hover
// with a mouse, press and hold on a touchscreen. Its box never changes size,
// because a control bar that reflows on hover is its own bug.
//
// Pointer events with a pointerType guard, NOT onMouseEnter/onTouchStart: after
// a tap every touch browser dispatches a compatibility mouseenter, which would
// re-open the peek and leave the answer on the projector until the host happens
// to tap elsewhere. (e.preventDefault() can't suppress it either, because React
// registers touchstart passively.)
//
// With onReveal this is also the reveal button: hold = private peek, quick tap =
// show the room. A hold is NEVER treated as a tap, so lingering on the control
// can't put the answer on the projector; only a deliberate short press does.
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

  // A click only counts if the press was short. Anything longer was a peek.
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
