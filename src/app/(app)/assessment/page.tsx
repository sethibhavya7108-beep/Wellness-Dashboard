import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { answeredSectionCount, draftFromRow } from "@/lib/wellness/assessment-fields";
import { AssessmentForm } from "./assessment-form";

export const metadata: Metadata = { title: "Baseline check" };

export default async function AssessmentPage() {
  const ctx = await requireOnboardedUser("/assessment");
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("kind", "baseline")
    .order("created_at", { ascending: false });

  const completed = rows?.find((r) => r.status === "completed");
  const draft = rows?.find((r) => r.status === "in_progress");

  if (completed) {
    return (
      <Container width="narrow" className="py-12">
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-forest-line bg-forest-soft">
              <CheckCircle2 className="size-6 text-forest" aria-hidden />
            </span>
            <h1 className="text-2xl leading-snug">Your baseline is done</h1>
            <p className="text-sm leading-relaxed text-muted">
              Completed on {formatDate(completed.completed_at ?? completed.created_at)}. You retake
              this at the end of your cycle, which is what gives the chapter a real before and after.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/assessment/results" className={buttonClasses()}>
                See your results
              </Link>
              <Link href="/dashboard" className={buttonClasses({ variant: "outline" })}>
                Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const values = draftFromRow(draft);
  const answered = answeredSectionCount(values);

  return (
    <Container width="narrow" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Baseline check</p>
        <h1 className="text-3xl leading-tight">
          {answered > 0 ? "Pick up where you left off" : "Seven short sections"}
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Sleep, food, water, movement, screens, sitting and stress. It saves as you go. Your
          answers are readable only by you — organisers only ever see campus-level totals.
        </p>
      </header>

      <AssessmentForm kind="baseline" initialValues={values} startStep={answered} />
    </Container>
  );
}
