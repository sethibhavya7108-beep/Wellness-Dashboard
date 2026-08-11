/**
 * Navigation is data, not markup.
 *
 * `status: "planned"` items render as visible-but-inert so students can see
 * what is coming without hitting a dead link. Flip to "live" in the same commit
 * that ships the route — nothing else needs to change.
 *
 * `icon` is a name rather than a component: these arrays are handed from server
 * layouts to the client nav, and only serializable values cross that boundary.
 * The name is resolved to a component in `app-nav.tsx`.
 */
export type NavIconName =
  | "dashboard"
  | "roadmap"
  | "habits"
  | "progress"
  | "events"
  | "learn"
  | "leaderboard"
  | "students"
  | "challenges";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  status: "live" | "planned";
  /** Shown in the mobile bottom bar. Keep to four or fewer live items. */
  primary?: boolean;
};

export const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", status: "live", primary: true },
  { href: "/roadmap", label: "Roadmap", icon: "roadmap", status: "live", primary: true },
  { href: "/habits", label: "Habits", icon: "habits", status: "live", primary: true },
  { href: "/progress", label: "Progress", icon: "progress", status: "live" },
  { href: "/events", label: "Events", icon: "events", status: "live", primary: true },
  { href: "/content", label: "Learn", icon: "learn", status: "live" },
  { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard", status: "live" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", status: "live", primary: true },
  { href: "/admin/students", label: "Students", icon: "students", status: "live", primary: true },
  { href: "/admin/analytics", label: "Analytics", icon: "progress", status: "planned" },
  { href: "/admin/events", label: "Events", icon: "events", status: "planned" },
  { href: "/admin/challenges", label: "Challenges", icon: "challenges", status: "planned" },
  { href: "/admin/content", label: "Content", icon: "learn", status: "planned" },
];
