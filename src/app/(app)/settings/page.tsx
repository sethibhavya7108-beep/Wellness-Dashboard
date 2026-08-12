import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Your settings" };

export default async function SettingsPage() {
  const ctx = await requireOnboardedUser("/settings");
  if (!ctx.profile) return null;

  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("assessments")
    .select("kind, completed_at")
    .eq("user_id", ctx.userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <Container width="narrow" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Settings</p>
        <h1 className="text-3xl leading-tight">Your details</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Change any of this whenever you like. Your college email stays fixed — it is how your
          account is identified.
        </p>
      </header>

      <SettingsForm profile={ctx.profile} />

      <Card>
        <CardContent className="flex flex-col gap-4 p-7 sm:flex-row sm:items-start">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-accent-line bg-accent-soft">
            <ClipboardList className="size-5 text-accent" aria-hidden />
          </span>

          <div className="flex-1 space-y-2">
            <h2 className="text-lg leading-snug">Where you are now</h2>
            <p className="text-sm leading-relaxed text-muted">
              {latest?.completed_at
                ? `Your last check was on ${formatDate(latest.completed_at)}. Things change — sleep,
                   stress and routine all move through a term. Retake it whenever your answers no
                   longer describe you, and your roadmap follows.`
                : "You have not completed a check yet. It is what turns this into a personal roadmap."}
            </p>
            <p className="text-xs text-muted">
              Your original baseline is kept untouched, so the chapter&rsquo;s before-and-after
              comparison stays honest.
            </p>
            <div className="pt-1">
              <Link href="/assessment/update" className={buttonClasses({ variant: "outline" })}>
                {latest ? "Update your status and goals" : "Start your baseline check"}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
