"use client";

import * as React from "react";
import { Check, Minus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CheckinStatus } from "@/lib/supabase/database.types";
import { logCheckin } from "./actions";

const CHOICES: { value: CheckinStatus; label: string; icon: React.ElementType }[] = [
  { value: "yes", label: "Did it", icon: Check },
  { value: "partial", label: "Partly", icon: Minus },
  { value: "no", label: "Not today", icon: X },
];

export function CheckinRow({
  habitId,
  title,
  description,
  categoryLabel,
  points,
  initialStatus,
}: {
  habitId: string;
  title: string;
  description: string;
  categoryLabel: string;
  points: number;
  initialStatus: CheckinStatus | null;
}) {
  const [status, setStatus] = React.useState<CheckinStatus | null>(initialStatus);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [earned, setEarned] = React.useState<{ code: string; name: string }[]>([]);

  function choose(next: CheckinStatus) {
    const previous = status;
    setStatus(next); // Optimistic: the row reflects the tap immediately.
    setError(null);

    startTransition(async () => {
      const result = await logCheckin(habitId, next);
      if (result.error) {
        setStatus(previous);
        setError(result.error);
        return;
      }
      if (result.newBadges?.length) setEarned(result.newBadges);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{categoryLabel}</Badge>
            <span className="text-xs text-muted">{points} points</span>
          </div>
          <p className="font-medium text-ink">{title}</p>
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        </div>

        <div className="flex gap-2" role="group" aria-label={`Log ${title}`}>
          {CHOICES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              aria-pressed={status === value}
              onClick={() => choose(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                "disabled:opacity-60",
                status === value
                  ? "border-accent bg-accent-soft font-medium text-ink"
                  : "border-line-strong text-muted hover:bg-raised",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {error ? <p className="text-xs font-medium text-status-priority">{error}</p> : null}

        {earned.length > 0 ? (
          <p className="text-xs text-forest" role="status">
            Badge earned: {earned.map((b) => b.name).join(", ")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
