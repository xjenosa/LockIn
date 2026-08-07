// The LockIn brand mark: a padlock, coral shackle over a teal body, ink
// keyhole. Same geometry as the favicon (app/icon.svg) minus the rounded badge
// tile, so it drops straight onto any dark surface. Parent sizes it via
// className (height/width, em or fixed); the colors are fixed brand tokens
// (flare / signal / ink) and must track tailwind.config.ts if those change.
export default function LockMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <path
        d="M23 31v-8a9 9 0 0 1 18 0v8"
        stroke="#F38764"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect x="16" y="30" width="32" height="23" rx="5.5" fill="#43E2D2" />
      <circle cx="32" cy="40" r="3" fill="#010A13" />
      <rect x="30.5" y="40" width="3" height="8" rx="1.5" fill="#010A13" />
    </svg>
  );
}
