import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, ProfileRow } from "@/lib/supabase/database.types";
import { isAdmin } from "./roles";

export type AuthContext = {
  userId: string;
  email: string;
  profile: ProfileRow | null;
  roles: AppRole[];
};

/**
 * Current user, profile and roles.
 *
 * `cache` deduplicates the queries across a single render pass, so a layout and
 * the page inside it share one round trip.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createClient();

  // getUser() revalidates the JWT with Supabase; never trust getSession() alone
  // on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? profile?.email ?? "",
    profile: profile ?? null,
    roles: (roleRows ?? []).map((r) => r.role),
  };
});

/** Require a signed-in user, or bounce to login preserving the target path. */
export async function requireUser(returnTo?: string): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  return ctx;
}

/** Require a user who has finished profile setup and accepted the consent notice. */
export async function requireOnboardedUser(returnTo?: string): Promise<AuthContext> {
  const ctx = await requireUser(returnTo);
  if (!ctx.profile?.profile_completed_at) redirect("/onboarding");
  return ctx;
}

/** Require an admin. Non-admins get a 404 rather than a hint that /admin exists. */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser("/admin");
  if (!isAdmin(ctx.roles)) redirect("/dashboard");
  return ctx;
}
