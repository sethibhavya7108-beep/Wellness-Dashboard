"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

const currentYear = new Date().getFullYear();

const settingsSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(80, "That name is too long"),
  batch_year: z.coerce
    .number()
    .int()
    .min(currentYear - 6, "Choose your graduating year")
    .max(currentYear + 8, "Choose your graduating year"),
  program: z.string().trim().min(1, "Choose your course").max(120),
  living_situation: z.enum(["hostel", "pg", "day_scholar"], {
    message: "Choose where you currently live",
  }),
  leaderboard_opt_in: z.literal("on").optional(),
});

/**
 * Update the details a student gave at onboarding.
 *
 * Email, id and created_at are not editable and are not even accepted here —
 * a database trigger reverts any attempt to change them, so the form and the
 * schema agree with what the database will actually allow.
 */
export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const parsed = settingsSchema.safeParse({
    full_name: formData.get("full_name"),
    batch_year: formData.get("batch_year"),
    program: formData.get("program"),
    living_situation: formData.get("living_situation"),
    leaderboard_opt_in: formData.get("leaderboard_opt_in") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      batch_year: parsed.data.batch_year,
      program: parsed.data.program,
      living_situation: parsed.data.living_situation,
      leaderboard_opt_in: parsed.data.leaderboard_opt_in === "on",
    })
    .eq("id", user.id);

  if (error) return { error: "We could not save your changes. Please try again." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { ok: true };
}
