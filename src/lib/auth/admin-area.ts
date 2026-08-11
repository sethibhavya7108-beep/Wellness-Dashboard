import "server-only";

import { redirect } from "next/navigation";
import { requireAdmin } from "./session";
import { canAccessArea, type AdminArea } from "./roles";
import type { AuthContext } from "./session";

/**
 * Require a role that may reach a specific admin area.
 *
 * `requireAdmin` is the outer gate on the whole section; this is the inner one,
 * so a content manager cannot walk into the events area by typing the URL. The
 * mapping lives in roles.ts, which means adding a role is a one-file change.
 */
export async function requireArea(area: AdminArea): Promise<AuthContext> {
  const ctx = await requireAdmin();
  if (!canAccessArea(ctx.roles, area)) redirect("/admin");
  return ctx;
}
