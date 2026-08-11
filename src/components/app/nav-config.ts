import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Route,
  Trophy,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Navigation is data, not markup.
 *
 * `status: "planned"` items render as visible-but-inert so students can see
 * what is coming without hitting a dead link. Flip to "live" in the same commit
 * that ships the route — nothing else needs to change.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  status: "live" | "planned";
  /** Shown in the mobile bottom bar. Keep to four or fewer live items. */
  primary?: boolean;
};

export const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, status: "live", primary: true },
  { href: "/roadmap", label: "Roadmap", icon: Route, status: "planned", primary: true },
  { href: "/habits", label: "Habits", icon: ListChecks, status: "planned", primary: true },
  { href: "/progress", label: "Progress", icon: TrendingUp, status: "planned" },
  { href: "/events", label: "Events", icon: CalendarDays, status: "planned", primary: true },
  { href: "/content", label: "Learn", icon: BookOpen, status: "planned" },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, status: "planned" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, status: "live", primary: true },
  { href: "/admin/students", label: "Students", icon: Users, status: "live", primary: true },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp, status: "planned" },
  { href: "/admin/events", label: "Events", icon: CalendarDays, status: "planned" },
  { href: "/admin/challenges", label: "Challenges", icon: ClipboardList, status: "planned" },
  { href: "/admin/content", label: "Content", icon: BookOpen, status: "planned" },
];
