import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({
  className,
  width = "default",
  ...props
}: React.ComponentProps<"div"> & { width?: "default" | "narrow" | "wide" }) {
  const widths = {
    narrow: "max-w-2xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  } as const;
  return <div className={cn("mx-auto w-full px-5 sm:px-8", widths[width], className)} {...props} />;
}

export function Section({
  className,
  bordered,
  ...props
}: React.ComponentProps<"section"> & { bordered?: boolean }) {
  return (
    <section
      className={cn("py-16 sm:py-section", bordered && "border-t border-line", className)}
      {...props}
    />
  );
}

/** Editorial section heading: eyebrow, title, optional standfirst. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="max-w-3xl text-3xl leading-[1.15] sm:text-4xl">{title}</h2>
      {description ? (
        <p className="max-w-2xl text-base leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}
