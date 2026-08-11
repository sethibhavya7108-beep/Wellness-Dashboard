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

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) userId = data.user?.id ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=link_invalid", origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed_at")
    .eq("id", userId)
    .maybeSingle();

  return NextResponse.redirect(
    new URL(profile?.profile_completed_at ? next : "/onboarding", origin),
  );
}
