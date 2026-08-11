"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { emailSchema, emailDomain } from "@/lib/auth/domains";
import { safeNext } from "@/lib/auth/next-url";

export type LoginState = { error?: string; fieldErrors?: Record<string, string> };

const otpSchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

/**
 * Step 1 — send a one-time code.
 *
 * Enforcement layer 2 of 3: the domain is re-checked against the database here,
 * because a client-side check is only a hint. Layer 3 is the trigger on
 * auth.users, which aborts signup even if this action were bypassed entirely.
 */
export async function requestOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return { fieldErrors: { email: parsedEmail.error.issues[0].message } };
  }

  const email = parsedEmail.data;
  const next = safeNext(formData.get("next"));

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: "The app is not connected to Supabase yet. See README.md for setup." };
  }

  const { data: approved, error: rpcError } = await supabase.rpc("is_email_domain_approved", {
    check_email: email,
  });

  if (rpcError) {
    return { error: "We could not reach the sign-in service. Please try again in a moment." };
  }

  if (!approved) {
    return {
      fieldErrors: {
        email: `@${emailDomain(email)} is not an approved college domain for this platform.`,
      },
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return {
      error:
        error.status === 429
          ? "Too many requests. Wait a minute before asking for another code."
          : "We could not send that email. Please check the address and try again.",
    };
  }

  redirect(`/login/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

/** Step 2 — exchange the emailed code for a session. */
export async function verifyOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = otpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { fieldErrors: { [String(issue.path[0])]: issue.message } };
  }

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error || !data.user) {
    return {
      fieldErrors: {
        token: "That code is not valid or has expired. Request a new one below.",
      },
    };
  }

  // Recorded so the admin dashboard can count daily sign-ins. Carries no
  // health data and no device fingerprint — just that a session began.
  await supabase.from("analytics_events").insert({
    user_id: data.user.id,
    name: "signed_in",
    properties: { method: "otp_code" },
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed_at")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(profile?.profile_completed_at ? next : "/onboarding");
}
