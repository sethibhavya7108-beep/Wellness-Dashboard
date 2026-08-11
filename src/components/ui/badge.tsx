import * as React from "react";
import { cn } from "@/lib/utils";
import type { ScoreStatus } from "@/lib/supabase/database.types";

type Tone = "neutral" | "accent" | "forest" | ScoreStatus;

const tones: Record<Tone, string> = {
  neutral: "border-line bg-raised text-muted",
  accent: "border-accent-line bg-accent-soft text-accent",
  forest: "border-forest-line bg-forest-soft text-forest",
  good: "border-forest-line bg-status-good-soft text-status-good",
  fair: "border-accent-line bg-status-fair-soft text-status-fair",
  attention: "border-accent-line bg-status-attention-soft text-status-attention",
  priority: "border-status-priority/20 bg-status-priority-soft text-status-priority",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5",
        "text-[0.6875rem] font-semibold tracking-wide uppercase",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
