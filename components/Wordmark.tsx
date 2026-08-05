// The Blare wordmark: a teal beacon bar, then the name in heavy white caps.
// No exclamation point, no tagline (see BRAND.md).
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <h1 className={`font-display text-white flex items-center justify-center ${className}`}>
      <span className="inline-block h-[0.82em] w-[0.16em] rounded-full bg-signal mr-[0.18em]" />
      BLARE
    </h1>
  );
}
