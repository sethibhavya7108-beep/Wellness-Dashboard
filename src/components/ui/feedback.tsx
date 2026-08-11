import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "error";

const alertTones: Record<Tone, { wrap: string; icon: React.ElementType }> = {
  info: { wrap: "border-line bg-raised text-ink-soft", icon: Info },
  success: { wrap: "border-forest-line bg-forest-soft text-forest", icon: CheckCircle2 },
  warning: { wrap: "border-accent-line bg-accent-soft text-status-fair", icon: TriangleAlert },
  error: {
    wrap: "border-status-priority/25 bg-status-priority-soft text-status-priority",
    icon: AlertCircle,
  },
};

export function Alert({
  tone = "info",
  title,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { tone?: Tone; title?: string }) {
  const { wrap, icon: Icon } = alertTones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", wrap, className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-raised", className)}
      {...props}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed",
        "border-line-strong bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="size-6 text-faint" aria-hidden /> : null}
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
