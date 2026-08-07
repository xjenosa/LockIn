import LockMark from "./LockMark";

// The LockIn wordmark: the padlock mark, then the name in heavy white type
// (Archivo Black). No exclamation point, no tagline (see BRAND.md). The inline
// mark scales with font-size (0.9em). Pass showMark={false} where a larger
// standalone LockMark already sits adjacent, e.g. the hero stacks one above
// this so the word centers on its own.
export default function Wordmark({
  className = "",
  showMark = true,
}: {
  className?: string;
  showMark?: boolean;
}) {
  return (
    <h1 className={`font-display text-white flex items-center justify-center ${className}`}>
      {showMark && <LockMark className="h-[0.9em] w-[0.9em] mr-[0.14em] shrink-0" />}
      LockIn
    </h1>
  );
}
