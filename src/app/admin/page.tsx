import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { StatCard, DistributionBar } from "@/components/app/stat-card";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin overview" };

const LIVING_LABELS: Record<string, string> = {
  hostel: "Hostel",
  pg: "PG / rented",
  day_scholar: "Day scholar",
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const weekAgo = daysAgoIso(7);

  // Every figure below is a live count. Nothing on this page is hard-coded.
  const [total, completed, recent, { data: profiles }, events, content] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("profile_completed_at", "is", null),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase.from("profiles").select("batch_year, living_situation"),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("content").select("id", { count: "exact", head: true }),
  ]);

  const rows = profiles ?? [];

  const byBatch = tally(
    rows.map((r) => (r.batch_year ? String(r.batch_year) : "Not set")),
  );
  const byLiving = tally(
    rows.map((r) => (r.living_situation ? LIVING_LABELS[r.living_situation] : "Not set")),
  );

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Admin</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">Chapter overview</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Registration and segmentation figures, read live from the database. Health metrics are not
          shown here by design — see the note at the bottom of this page.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered accounts" value={total.count ?? 0} />
        <StatCard
          label="Profiles completed"
          value={completed.count ?? 0}
          note={percentNote(completed.count ?? 0, total.count ?? 0)}
        />
        <StatCard label="Joined this week" value={recent.count ?? 0} note="Last 7 days" />
        <StatCard
          label="Events / posts"
          value={`${events.count ?? 0} / ${content.count ?? 0}`}
          note="Created in the admin area"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-5 p-7">
            <div>
              <h2 className="text-lg leading-snug">Students by batch</h2>
              <p className="mt-1 text-sm text-muted">Graduating year, from completed profiles.</p>
            </div>
            <DistributionBar rows={byBatch} total={rows.length} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-7">
            <div>
              <h2 className="text-lg leading-snug">Students by living situation</h2>
              <p className="mt-1 text-sm text-muted">
                A segmentation variable for analysis, not an indicator of health.
              </p>
            </div>
            <DistributionBar rows={byLiving} total={rows.length} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex gap-4 p-7">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <div className="space-y-2">
            <h2 className="text-base leading-snug">Why there are no health figures here yet</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              Administrators have no row-level access to assessments, wellness scores or check-ins.
              That is enforced in the database, not just in this interface. Aggregate health
              reporting — average category scores, percentage flagged, baseline versus endline —
              will arrive as dedicated aggregate functions that return campus-level totals and never
              individual records.
            </p>
            <p className="text-sm text-muted">
              Registration and segmentation data is available now on{" "}
              <Link href="/admin/students" className="text-accent underline underline-offset-4">
                the students page
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

function tally(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function percentNote(part: number, whole: number) {
  if (whole === 0) return "No accounts yet";
  return `${Math.round((part / whole) * 100)}% of registered accounts`;
}
