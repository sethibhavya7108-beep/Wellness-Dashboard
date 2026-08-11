import * as React from "react";
import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "accent",
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "accent" | "forest" | "ink";
  className?: string;
}) {
  const pct = clamp((value / max) * 100, 0, 100);
  const fill = { accent: "bg-accent", forest: "bg-forest", ink: "bg-ink" }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-raised", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Progress ring used for wellness and habit-completion figures.
 * Rendered as inline SVG so it needs no charting dependency.
 */
export function ProgressRing({
  value,
  max = 100,
  size = 120,
  stroke = 8,
  label,
  caption,
  tone = "accent",
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
  tone?: "accent" | "forest";
}) {
  const pct = clamp((value / max) * 100, 0, 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const colour = tone === "forest" ? "var(--color-forest)" : "var(--color-accent)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
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
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">
          {label ?? Math.round(pct)}
        </span>
        {caption ? <span className="text-[0.6875rem] text-muted">{caption}</span> : null}
      </div>
    </div>
  );
}

/** Step indicator for the multi-step onboarding flow. */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: readonly string[];
  current: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink">{steps[current] ?? ""}</span>
        <span className="tabular-nums text-muted">
          Step {current + 1} of {steps.length}
        </span>
      </div>
      <div className="flex gap-1" role="list" aria-label="Progress">
        {steps.map((step, i) => (
          <div
            key={step}
            role="listitem"
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < current && "bg-forest",
              i === current && "bg-accent",
              i > current && "bg-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}
