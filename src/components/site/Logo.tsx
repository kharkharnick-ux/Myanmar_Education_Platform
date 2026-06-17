export function Logo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid h-10 w-10 place-items-center rounded-xl glass-strong glow-text ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 9l9-5 9 5-9 5-9-5z" />
        <path d="M7 11v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4" />
        <path d="M21 9v5" />
      </svg>
    </div>
  );
}
