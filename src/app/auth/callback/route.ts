import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/next-url";

/**
 * Handles the sign-in link from the OTP email.
 *
 * Supports both shapes Supabase can send: `token_hash` + `type` (the current
 * default) and `code` (PKCE). Students who type the six-digit code instead
 * never reach this route.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let userId: string | null = null;
  let failure: string | null = null;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) failure = error.message;
    else userId = data.user?.id ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) failure = error.message;
    else userId = data.user?.id ?? null;
  }

  if (!userId) {
    // The domain gate is enforced by handle_new_user() inside the signup
    // transaction, so a personal Google account surfaces here as a provider
    // error rather than anything OAuth understands. Name it plainly instead of
    // telling someone their link expired when it did not.
    const rejected = failure?.toLowerCase().includes("approved college email");
    return NextResponse.redirect(
      new URL(rejected ? "/login?error=domain_not_approved" : "/login?error=link_invalid", origin),
    );
  }

  await supabase.from("analytics_events").insert({
    user_id: userId,
    name: "signed_in",
    properties: { method: "email_link" },
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed_at")
    .eq("id", userId)
    .maybeSingle();

  return NextResponse.redirect(
    new URL(profile?.profile_completed_at ? next : "/onboarding", origin),
  );
}
