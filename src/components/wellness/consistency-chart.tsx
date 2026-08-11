import { cn } from "@/lib/utils";
import type { CheckinStatus } from "@/lib/supabase/database.types";

/**
 * Consistency and performance charts.
 *
 * Inline SVG and CSS grid rather than a charting library — the project takes no
 * dependency it does not need, and these two shapes are the whole requirement.
 * Every colour comes from a design token so both themes stay correct.
 */

export type DayCell = {
  date: string;
  status: CheckinStatus | null;
};

const CELL_TONE: Record<CheckinStatus, string> = {
  yes: "bg-forest",
  partial: "bg-accent",
  no: "bg-line-strong",
};

const CELL_LABEL: Record<CheckinStatus, string> = {
  yes: "Done",
  partial: "Partly done",
  no: "Not done",
};

/**
 * A calendar strip: one square per day, most recent last.
 *
 * Shows the shape of a habit at a glance — a solid run reads differently from
 * the same completion rate scattered across a month, and that difference is the
 * thing worth seeing.
 */
export function ConsistencyStrip({ days, className }: { days: DayCell[]; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1" role="img" aria-label={describeStrip(days)}>
        {days.map((d) => (
          <span
            key={d.date}
            title={`${d.date}: ${d.status ? CELL_LABEL[d.status] : "No entry"}`}
            className={cn(
              "size-3.5 rounded-xs",
              d.status ? CELL_TONE[d.status] : "bg-raised",
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[0.6875rem] text-muted">
        <Key className="bg-forest" label="Done" />
        <Key className="bg-accent" label="Partly" />
        <Key className="bg-line-strong" label="Missed" />
        <Key className="bg-raised" label="No entry" />
      </div>
    </div>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-xs", className)} aria-hidden />
      {label}
    </span>
  );
}

function describeStrip(days: DayCell[]): string {
  const done = days.filter((d) => d.status === "yes").length;
  const partial = days.filter((d) => d.status === "partial").length;
  return `${done} days done and ${partial} partly done out of ${days.length}.`;
}

/**
 * Weekly completion over time, as a small bar chart.
 *
 * Y axis is a percentage, so bars stay comparable even when a week has fewer
 * expected days than the one before it.
 */
export function WeeklyBars({
  weeks,
  className,
}: {
  weeks: { label: string; rate: number }[];
  className?: string;
}) {
  if (weeks.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex h-24 items-end gap-2"
        role="img"
        aria-label={weeks
          .map((w) => `${w.label}: ${Math.round(w.rate * 100)} percent`)
          .join(", ")}
      >
        {weeks.map((w) => (
          <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-full w-full items-end">
              <div
                className={cn(
                  "w-full rounded-t-xs transition-[height]",
                  w.rate >= 0.8 ? "bg-forest" : w.rate >= 0.4 ? "bg-accent" : "bg-line-strong",
                )}
                // Floor at 2% so a zero week is still visible as an empty bar
                // rather than vanishing and looking like missing data.
                style={{ height: `${Math.max(w.rate * 100, 2)}%` }}
              />
            </div>
            <span className="text-[0.625rem] whitespace-nowrap text-muted">{w.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact ring for a single completion percentage. */
export function CompletionDial({
  rate,
  size = 44,
  label,
}: {
  rate: number;
  size?: number;
  label?: string;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(rate, 0), 1);
  const colour =
    pct >= 0.8 ? "var(--color-forest)" : pct >= 0.4 ? "var(--color-accent)" : "var(--color-muted)";

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(pct * 100)} percent complete`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-raised)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <span className="absolute text-[0.625rem] font-medium tabular-nums text-ink">
        {Math.round(pct * 100)}
      </span>
    </span>
  );
}
