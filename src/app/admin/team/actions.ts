"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/supabase/database.types";

export type TeamState = { error?: string; ok?: string };

const GRANTABLE: AppRole[] = [
  "admin",
  "super_admin",
  "reviewer",
  "event_manager",
  "content_manager",
];

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(GRANTABLE as [AppRole, ...AppRole[]], { message: "Choose a role" }),
});

/**
 * Grant or revoke a role.
 *
 * The real authorization lives in `set_user_role()`, which re-checks that the
 * caller is a super admin and refuses to remove the last one. The check here is
 * only so the screen can fail politely instead of surfacing a database error.
 */
async function changeRole(formData: FormData, grant: boolean): Promise<TeamState> {
  const ctx = await requireAdmin();
  if (!hasRole(ctx.roles, "super_admin")) {
    return { error: "Only a super admin can change roles." };
  }

  const parsed = schema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    p_email: parsed.data.email,
    p_role: parsed.data.role,
    p_grant: grant,
  });

  if (error) {
    // The function raises with a message written for a person, so it is shown
    // rather than replaced with something vaguer.
    return { error: error.message.replace(/^.*?:\s*/, "") };
  }

  revalidatePath("/admin/team");
  return {
    ok: grant
      ? `${parsed.data.email} is now ${parsed.data.role.replace("_", " ")}.`
      : `Removed ${parsed.data.role.replace("_", " ")} from ${parsed.data.email}.`,
  };
}

export async function grantRole(_prev: TeamState, formData: FormData): Promise<TeamState> {
  return changeRole(formData, true);
}

export async function revokeRole(email: string, role: string): Promise<TeamState> {
  const data = new FormData();
  data.set("email", email);
  data.set("role", role);
  return changeRole(data, false);
}
