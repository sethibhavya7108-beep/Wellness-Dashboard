import { cn } from "@/lib/utils";

/**
 * Original chapter mark: an open progress ring, echoing the wellness rings used
 * throughout the product. Deliberately geometric and typographic — no borrowed
 * assets.
 */
export function Wordmark({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="var(--color-line-strong)" strokeWidth="3" />
        <path
          d="M12 2.5a9.5 9.5 0 0 1 8.23 4.75"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="3" fill="var(--color-forest)" />
      </svg>
      {showText ? (
        <span className="font-display text-[0.9375rem] font-semibold tracking-tight text-ink">
          Campus Wellness
        </span>
      ) : null}
      <span className="sr-only">Campus Wellness, NationBuilding Impact Chapter, SSCBS</span>
    </span>
  );
}
