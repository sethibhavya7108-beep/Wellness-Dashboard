import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarDays, CheckCircle2, ClipboardList, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getLatestScore } from "@/lib/wellness/latest-score";
import { getConsistencySummary, getHabitCharts } from "@/lib/wellness/consistency";
import { getActiveRoadmap } from "@/lib/wellness/roadmap-service";
import { ConsistencyPanel } from "@/components/wellness/consistency-panel";
import { overallLabel } from "@/components/wellness/score-display";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const LIVING_LABELS: Record<string, string> = {
  hostel: "Hostel",
  pg: "PG / rented",
  day_scholar: "Day scholar",
};

export default async function DashboardPage() {
  const ctx = await requireOnboardedUser();
  const supabase = await createClient();

  // Real queries against live tables. Empty results render empty states rather
  // than placeholder numbers.
  const [{ data: baseline }, { data: events }, { data: posts }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, status, completed_at")
      .eq("kind", "baseline")
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, title, starts_at, location")
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(3),
    supabase
      .from("content")
      .select("id, title, summary, type, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  const profile = ctx.profile;
  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const baselineDone = baseline?.status === "completed";
  const score = baselineDone ? await getLatestScore(ctx.userId) : null;

  // Consistency and per-goal charts. Fetched together so the dashboard stays
  // one round of parallel queries rather than a waterfall.
  const [consistency, roadmap, charts] = await Promise.all([
    getConsistencySummary(),
    getActiveRoadmap(ctx.userId),
    getHabitCharts(28),
  ]);

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Your dashboard</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">Good to see you, {firstName}.</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Your account is set up. The baseline wellness check is the next thing to complete — it is
          what turns this into a personal roadmap rather than a login page.
        </p>
      </header>

      {/* ------------------------------------------------------------- Next step */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-7 sm:flex-row sm:items-start">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-accent-line bg-accent-soft">
            <ClipboardList className="size-5 text-accent" aria-hidden />
          </span>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg leading-snug">Baseline wellness check</h2>
              {baselineDone ? (
                <Badge tone="good">Completed</Badge>
              ) : (
                <Badge tone="neutral">Not started</Badge>
              )}
            </div>

            {baselineDone ? (
              <p className="text-sm leading-relaxed text-muted">
                Completed on {formatDate(baseline.completed_at ?? new Date())}.
                {score ? ` Your score is ${score.overallScore} out of 100 — ${overallLabel(score.overallScore).toLowerCase()}.` : ""}
              </p>
            ) : (
              <p className="max-w-2xl text-sm leading-relaxed text-muted">
                Seven short sections covering sleep, food, water, movement, screen time, sitting and
                stress. It saves as you go, and nothing is shared with anyone individually.
              </p>
            )}

            <div className="pt-2">
              <Link
                href={baselineDone ? "/assessment/results" : "/assessment"}
                className={buttonClasses({ variant: baselineDone ? "outline" : "primary" })}
              >
                {baselineDone ? "See your results" : "Start the check"}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------- Consistency and goals */}
      {roadmap ? (
        <ConsistencyPanel
          summary={consistency}
          habits={roadmap.habits}
          charts={charts}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------------------------------------------------- Your details */}
        <Card>
          <CardContent className="space-y-5 p-7">
            <h2 className="text-lg leading-snug">Your details</h2>

            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Name" value={profile?.full_name ?? "—"} />
              <Detail label="College email" value={ctx.email} />
              <Detail label="Batch" value={profile?.batch_year?.toString() ?? "—"} />
              <Detail label="Course" value={profile?.program ?? "—"} />
              <Detail
                label="Living situation"
                value={
                  profile?.living_situation ? LIVING_LABELS[profile.living_situation] : "—"
                }
                icon={MapPin}
              />
              <Detail
                label="Role"
                value={ctx.roles.map((r) => ROLE_LABELS[r]).join(", ") || "Student"}
              />
            </dl>
          </CardContent>
        </Card>

        {/* --------------------------------------------------------------- Consent */}
        <Card>
          <CardContent className="space-y-5 p-7">
            <h2 className="text-lg leading-snug">Privacy and consent</h2>

            <ul className="space-y-3 text-sm">
              <ConsentLine>
                Email verified — only approved college domains can register.
              </ConsentLine>
              <ConsentLine>
                {profile?.consent_accepted_at
                  ? `Consent recorded on ${formatDate(profile.consent_accepted_at)} (version ${profile.consent_version ?? "—"}).`
                  : "Consent not yet recorded."}
              </ConsentLine>
              <ConsentLine>
                Your health answers are readable only by you. Organisers see campus-level totals.
              </ConsentLine>
              <ConsentLine>
                Leaderboards use habits and events only — never BMI, weight, stress or scores.
              </ConsentLine>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------------------------------------------------------- Events */}
        <section className="space-y-4">
          <h2 className="text-lg leading-snug">Upcoming events</h2>
          {events && events.length > 0 ? (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id}>
                  <Card>
                    <CardContent className="flex items-start gap-4 p-5">
                      <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                      <div>
                        <p className="font-medium text-ink">{e.title}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          {formatDate(e.starts_at, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {e.location ? ` · ${e.location}` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No events scheduled yet"
              description="Wellness drives, screenings and challenges will show up here once the chapter publishes them."
            />
          )}
        </section>

        {/* --------------------------------------------------------------- Content */}
        <section className="space-y-4">
          <h2 className="text-lg leading-snug">From the chapter</h2>
          {posts && posts.length > 0 ? (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <Card>
                    <CardContent className="space-y-1.5 p-5">
                      <Badge tone="accent">{p.type.replace("_", " ")}</Badge>
                      <p className="font-medium text-ink">{p.title}</p>
                      {p.summary ? <p className="text-sm text-muted">{p.summary}</p> : null}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Nothing published yet"
              description="Awareness posts, challenge results and event highlights will appear here."
            />
          )}
        </section>
      </div>
    </Container>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="flex items-center gap-1.5 text-sm text-ink">
        {Icon ? <Icon className="size-3.5 text-faint" aria-hidden /> : null}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

function ConsentLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
      <span className="leading-relaxed text-muted">{children}</span>
    </li>
  );
}
