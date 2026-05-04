export function SentryLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 32 32" className="h-full w-auto">
        <path
          d="M16 8 L24.5 16 L20 16 L20 24 L12 24 L12 16 L7.5 16 Z"
          fill="currentColor"
        />
        <circle cx="16" cy="27.5" r="1" fill="currentColor" opacity="0.7" />
      </svg>
    </div>
  );
}
