import type { Metadata } from "next";
import { OTP_LENGTH_WORD } from "@/lib/auth/otp";
import { AuthShell } from "@/components/site/auth-shell";
import { Alert } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/next-url";
import { LoginForm } from "./login-form";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = { title: "Sign in" };

/** Read the live allow-list so the sign-in copy is never out of date. */
async function loadDomains(): Promise<{ domains: string[]; configured: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("approved_email_domains")
      .select("domain")
      .eq("is_active", true)
      .order("domain");

    if (error) return { domains: [], configured: true };
    return { domains: (data ?? []).map((d) => d.domain), configured: true };
  } catch {
    return { domains: [], configured: false };
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { domains, configured } = await loadDomains();

  return (
    <AuthShell>
      <div className="space-y-8">
        <div className="space-y-2.5">
          <h1 className="text-3xl leading-tight">Sign in to Campus Wellness</h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            We will email you an {OTP_LENGTH_WORD}-digit code. No password to remember, and your college email is
            what keeps the platform limited to SSCBS students.
          </p>
        </div>

        {!configured ? (
          <Alert tone="error" title="Supabase is not configured">
            Copy <code className="font-mono text-xs">.env.example</code> to{" "}
            <code className="font-mono text-xs">.env.local</code> and add your project URL and anon
            key. Setup steps are in <code className="font-mono text-xs">README.md</code>.
          </Alert>
        ) : null}

        {params.error === "link_invalid" ? (
          <Alert tone="error" title="That sign-in link did not work">
            It may have expired or already been used. Request a new code below.
          </Alert>
        ) : null}

        {params.error === "google_unavailable" ? (
          <Alert tone="error" title="Google sign-in is not available">
            Use your college email and an {OTP_LENGTH_WORD}-digit code instead.
          </Alert>
        ) : null}

        {/* The database refuses the signup rather than the OAuth provider, so
            this is what a personal Google account lands on. */}
        {params.error === "domain_not_approved" ? (
          <Alert tone="error" title="That account is not a college address">
            Campus Wellness is limited to approved college domains. Sign in with your
            {domains.length > 0 ? ` @${domains[0]} ` : " college "}
            account.
          </Alert>
        ) : null}

        <LoginForm domains={domains} next={safeNext(params.next)} disabled={!configured} />

        <GoogleButton next={safeNext(params.next)} disabled={!configured} />
      </div>
    </AuthShell>
  );
}
