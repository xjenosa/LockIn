"use client";

import { useState } from "react";

// The host's laptop IS the projected screen, so any answer printed on it is an
// answer on the wall. This keeps one blurred until the host asks for it: hover
// with a mouse, press and hold on a touchscreen. Its box never changes size —
// a control bar that reflows on hover is its own bug.
//
// Pointer events with a pointerType guard, NOT onMouseEnter/onTouchStart: after
// a tap every touch browser dispatches a compatibility mouseenter, which would
// re-open the peek and leave the answer on the projector until the host happens
// to tap elsewhere. (e.preventDefault() can't suppress it either — React
// registers touchstart passively.)
export default function AnswerPeek({ text, className = "" }: { text: string; className?: string }) {
  const [peek, setPeek] = useState(false);

  return (
    <div
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setPeek(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setPeek(false);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") setPeek(true);
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== "mouse") setPeek(false);
      }}
      onPointerCancel={() => setPeek(false)}
      className={`rounded-xl bg-white/10 border border-white/25 px-4 py-3 flex items-center gap-2 select-none cursor-help ${className}`}
    >
      <span className="text-white/60 text-sm whitespace-nowrap">👁 Hold to peek</span>
      <span className={`font-bold max-w-[36ch] transition ${peek ? "text-gold" : "blur-sm opacity-40"}`}>
        {text}
      </span>
    </div>
  );
}
