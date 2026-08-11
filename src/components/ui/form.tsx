import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink " +
  "placeholder:text-faint transition-colors " +
  "focus:border-accent focus:outline-none focus-visible:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted " +
  "aria-[invalid=true]:border-status-priority";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-10 appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-sm font-medium text-ink-soft", className)}
      {...props}
    />
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "mt-0.5 size-4 shrink-0 cursor-pointer rounded-xs border border-line-strong",
        "accent-accent disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Label + control + hint/error in one block.
 *
 * The caller gives the control `id={htmlFor}` and
 * `aria-describedby={describedBy(htmlFor, { hint, error })}`.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-0.5 text-accent" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-status-priority">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Build the aria-describedby value matching a Field's hint and error ids. */
export function describedBy(id: string, opts: { hint?: string; error?: string }) {
  return cn(opts.hint && `${id}-hint`, opts.error && `${id}-error`) || undefined;
}
