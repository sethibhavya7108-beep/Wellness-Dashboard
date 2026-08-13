"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/env";
import { safeNext } from "@/lib/auth/next-url";

/**
 * Start the Google sign-in flow.
 *
 * The approved-domain gate still applies: `handle_new_user()` runs inside the
 * signup transaction whatever the provider, so a personal Google account is
 * refused at the database. Google is a second door into the same building, not
 * a way around the lock.
 *
 * `prompt: select_account` is set because students are routinely signed into a
 * personal Google account in the same browser — without it they would be
 * silently signed in with the wrong one and told their college was not approved.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google_unavailable");
  }

  redirect(data.url);
}
