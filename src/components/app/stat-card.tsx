import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A single headline figure. `value` must come from a real query — never seed a
 * StatCard with an illustrative number.
 */
export function StatCard({
  label,
  value,
  note,
  className,
}: {
  label: string;
  value: string | number;
  note?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
        <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink tabular-nums">
          {value}
        </p>
        {note ? <p className="mt-1.5 text-xs text-muted">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

/** Horizontal distribution bar for small categorical breakdowns. */
export function DistributionBar({
  rows,
  total,
  className,
}: {
  rows: { label: string; count: number }[];
  total: number;
  className?: string;
}) {
  if (total === 0) {
    return <p className={cn("text-sm text-muted", className)}>No data yet.</p>;
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((r) => {
        const pct = Math.round((r.count / total) * 100);
        return (
          <li key={r.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-ink">{r.label}</span>
              <span className="tabular-nums text-muted">
                {r.count} <span className="text-faint">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
