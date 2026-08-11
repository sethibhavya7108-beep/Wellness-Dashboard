import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/site/auth-shell";
import { requireUser } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const ctx = await requireUser("/onboarding");

  if (ctx.profile?.profile_completed_at) redirect("/dashboard");

  return (
    <AuthShell width="default" backHref="/" backLabel="Back to home">
      <div className="space-y-8">
        <div className="space-y-2.5">
          <p className="eyebrow">Step 1 of 2 · Your profile</p>
          <h1 className="text-3xl leading-tight">A few details before we start</h1>
          <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted">
            This takes under a minute. Batch, course and living situation let the chapter compare
            campus-level results — for example how hostellers and day scholars differ — without
            anyone seeing your individual answers.
          </p>
        </div>

        <ProfileForm email={ctx.email} defaultName={ctx.profile?.full_name ?? ""} />
      </div>
    </AuthShell>
  );
}
