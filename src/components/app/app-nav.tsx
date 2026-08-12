"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Route,
  Settings,
  Trophy,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavIconName, NavItem } from "./nav-config";

/**
 * Icons resolve here rather than in `nav-config.ts`: a component reference is
 * not serializable, so it cannot be passed from a server layout to this file.
 */
const ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  roadmap: Route,
  habits: ListChecks,
  progress: TrendingUp,
  events: CalendarDays,
  learn: BookOpen,
  leaderboard: Trophy,
  students: Users,
  challenges: ClipboardList,
  settings: Settings,
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/dashboard" || href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
}

/** Horizontal navigation for tablet and desktop. */
export function AppNav({ items }: { items: NavItem[] }) {
  const isActive = useIsActive();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
      {items.map((item) =>
        item.status === "live" ? (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              isActive(item.href)
                ? "bg-raised font-medium text-ink"
                : "text-muted hover:bg-raised hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ) : (
          <span
            key={item.href}
            aria-disabled="true"
            title="Coming in a later release"
            className="cursor-default rounded-md px-3 py-1.5 text-sm text-faint"
          >
            {item.label}
            <span className="ml-1.5 text-[0.625rem] tracking-wide uppercase">soon</span>
          </span>
        ),
      )}
    </nav>
  );
}

/** Fixed bottom bar for phones — students use this on mobile above all else. */
export function AppNavMobile({ items }: { items: NavItem[] }) {
  const isActive = useIsActive();
  const primary = items.filter((i) => i.primary);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
      aria-label="Sections"
    >
      <ul className="mx-auto flex max-w-md">
        {primary.map((item) => {
          const active = item.status === "live" && isActive(item.href);
          const Icon = ICONS[item.icon];
          const content = (
            <>
              <Icon className="size-5" aria-hidden />
              <span className="text-[0.6875rem] leading-none">{item.label}</span>
            </>
          );

          return (
            <li key={item.href} className="flex-1">
              {item.status === "live" ? (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 transition-colors",
                    active ? "text-accent" : "text-muted",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex cursor-default flex-col items-center gap-1 py-2.5 text-faint"
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
