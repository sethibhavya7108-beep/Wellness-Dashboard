"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/auth/consent";

export type ProfileState = { error?: string; fieldErrors?: Record<string, string> };

const currentYear = new Date().getFullYear();

const profileSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Please enter your name")
      .max(80, "That name is too long"),
    batch_year: z.coerce
      .number()
      .int()
      .min(currentYear - 6, "Choose your graduating year")
      .max(currentYear + 8, "Choose your graduating year"),
    program: z.string().trim().min(1, "Choose your course"),
    program_other: z.string().trim().max(120).optional(),
    living_situation: z.enum(["hostel", "pg", "day_scholar"], {
      message: "Choose where you currently live",
    }),
    consent: z.literal("on", { message: "Please read and accept the notice to continue" }),
    // An unticked checkbox sends nothing at all, which is exactly "no".
    leaderboard_opt_in: z.literal("on").optional(),
  })
  .transform((v) => ({
    ...v,
    program: v.program === "Other" ? (v.program_other || "Other").slice(0, 120) : v.program,
  }));

/**
 * Completes profile setup and records consent.
 *
 * All values are validated here on the server; the browser form is only a
 * convenience. RLS restricts the write to the caller's own row, and a database
 * trigger prevents id, email and created_at from ever being changed.
 */
export async function completeProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    batch_year: formData.get("batch_year"),
    program: formData.get("program"),
    program_other: formData.get("program_other") ?? undefined,
    living_situation: formData.get("living_situation"),
    consent: formData.get("consent"),
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  const now = new Date().toISOString();

  // Upsert rather than update: the auth.users trigger normally creates this row,
  // but upserting keeps the flow working for accounts created before it existed.
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: parsed.data.full_name,
      batch_year: parsed.data.batch_year,
      program: parsed.data.program,
      living_situation: parsed.data.living_situation,
      leaderboard_opt_in: parsed.data.leaderboard_opt_in === "on",
      consent_accepted_at: now,
      consent_version: CONSENT_VERSION,
      profile_completed_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { error: "We could not save your profile. Please try again." };
  }

  await supabase.from("analytics_events").insert({
    user_id: user.id,
    name: "registration_completed",
    properties: { batch_year: parsed.data.batch_year, living_situation: parsed.data.living_situation },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
