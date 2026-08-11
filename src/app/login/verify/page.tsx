import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/site/auth-shell";
import { emailSchema } from "@/lib/auth/domains";
import { safeNext } from "@/lib/auth/next-url";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Enter your code" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const params = await searchParams;
  const parsed = emailSchema.safeParse(params.email);

  // Landing here without an email means the flow was skipped or the link was
  // shared; send the visitor back to the start rather than showing a dead form.
  if (!parsed.success) redirect("/login");

  return (
    <AuthShell backHref="/login" backLabel="Use a different email">
      <div className="space-y-8">
        <div className="space-y-2.5">
          <h1 className="text-3xl leading-tight">Check your email</h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            We sent a six-digit code to{" "}
            <span className="font-medium text-ink">{parsed.data}</span>. It is valid for one hour.
            The same email also contains a sign-in link, if that is easier.
          </p>
        </div>

        <VerifyForm email={parsed.data} next={safeNext(params.next)} />
      </div>
    </AuthShell>
  );
}
