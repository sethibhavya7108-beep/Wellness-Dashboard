import type { AppRole } from "@/lib/supabase/database.types";

/** Roles that unlock /admin. Authorization is by role, never by email address. */
export const ADMIN_ROLES: readonly AppRole[] = ["admin", "super_admin"];

/** Roles that may reach a given admin area. super_admin and admin see all. */
export const AREA_ROLES = {
  students: ["admin", "super_admin"],
  analytics: ["admin", "super_admin"],
  events: ["admin", "super_admin", "event_manager"],
  challenges: ["admin", "super_admin", "reviewer"],
  content: ["admin", "super_admin", "content_manager"],
} as const satisfies Record<string, readonly AppRole[]>;

export type AdminArea = keyof typeof AREA_ROLES;

export function isAdmin(roles: readonly AppRole[]): boolean {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}

export function canAccessArea(roles: readonly AppRole[], area: AdminArea): boolean {
  const allowed = AREA_ROLES[area] as readonly AppRole[];
  return roles.some((r) => allowed.includes(r));
}

export const ROLE_LABELS: Record<AppRole, string> = {
  student: "Student",
  admin: "Admin",
  super_admin: "Super admin",
  reviewer: "Medical reviewer",
  event_manager: "Event manager",
  content_manager: "Content manager",
};
