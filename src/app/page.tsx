import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Droplets,
  ExternalLink,
  Moon,
  Route,
  Trophy,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { ProgressRing } from "@/components/ui/progress";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

/*
 * Public landing page. Deliberately static: no session lookup, so it can be
 * served from the edge cache. "Sign in" routes through /login, which redirects
 * an already-authenticated student straight to their dashboard.
 */

const steps = [
  {
    n: "01",
    title: "Take the baseline check",
    body: "Seven short sections on sleep, food, water, movement, screens and stress. Roughly two minutes, and it saves as you go.",
  },
  {
    n: "02",
    title: "See your priorities",
    body: "You get a wellness summary and the two or three areas worth working on first — not a wall of every metric we collected.",
  },
  {
    n: "03",
    title: "Work a small roadmap",
    body: "A two to four week cycle of daily habits sized to where you actually are. Check in each day; the plan adapts if it is too easy or too hard.",
  },
  {
    n: "04",
    title: "Measure the change",
    body: "Retake the check at the end of the cycle and compare it to where you started. Your chapter sees the campus-level shift, never your individual data.",
  },
];

const features = [
  {
    icon: Route,
    title: "A roadmap, not a lecture",
    body: "Two or three priorities at a time, drawn from an approved habit library and sized to your baseline.",
  },
  {
    icon: ClipboardList,
    title: "Daily check-ins that take seconds",
    body: "Yes, partly, or no. Streaks and weekly summaries show consistency without drowning you in numbers.",
  },
  {
    icon: Trophy,
    title: "Challenges that reward effort",
    body: "Points and leaderboards run on habits completed and events attended — never on BMI, weight or stress.",
  },
  {
    icon: CalendarDays,
    title: "Campus events and screenings",
    body: "Wellness drives with visiting medical staff, plank challenges, nutrition quizzes and chapter mixers.",
  },
];

const evidence = [
  {
    org: "World Health Organization",
    title: "Guidelines on physical activity and sedentary behaviour",
    year: "2020",
    url: "https://www.who.int/publications/i/item/9789240015128",
  },
  {
    org: "ICMR — National Institute of Nutrition",
    title: "Dietary Guidelines for Indians",
    year: "2024",
    url: "https://main.icmr.nic.in/sites/default/files/upload_documents/DGI_07th_May_2024_fin.pdf",
  },
  {
    org: "FSSAI",
    title: "Eat Right Campus",
    year: "Initiative",
    url: "https://eatrightindia.gov.in/EatRightCampus/about",
  },
  {
    org: "AASM & Sleep Research Society",
    title: "Recommended amount of sleep for a healthy adult",
    year: "2015",
    url: "https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/",
  },
];

const aims = [
  { figure: "200+", label: "students registered in year one" },
  { figure: "60%", label: "weekly active participation in habit tracking" },
  { figure: "20%", label: "improvement in self-reported habit score, baseline to endline" },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* ---------------------------------------------------------------- Hero */}
        <Section className="pt-14 pb-16 sm:pt-20">
          <Container>
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
              <div className="max-w-2xl">
                <p className="eyebrow">NationBuilding Impact Chapter · SSCBS</p>
                <h1 className="mt-5 text-[2.6rem] leading-[1.05] sm:text-6xl">
                  Build healthier habits.
                  <span className="block text-accent">Build a healthier campus.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                  Most student health advice is generic and most apps ask for more effort than a
                  term schedule allows. This is a short baseline check that turns into a personal
                  plan — two or three small habits at a time, tracked daily, measured over a month.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link href="/login" className={buttonClasses({ size: "lg" })}>
                    Get started
                  </Link>
                  <a href="#how" className={buttonClasses({ variant: "outline", size: "lg" })}>
                    See how it works
                  </a>
                </div>

                <p className="mt-5 text-sm text-muted">
                  Open to students with an{" "}
                  <span className="font-medium text-ink-soft">@sscbs.du.ac.in</span> email address.
                </p>
              </div>

              <HeroPreview />
            </div>
          </Container>
        </Section>

        {/* ----------------------------------------------------------------- Why */}
        <Section id="why" bordered>
          <Container>
            <SectionHeading
              eyebrow="Why preventive health"
              title="The habits that matter most are the ones nobody tracks."
              description="Irregular timetables, mess and outside food, late nights before submissions, and long sitting hours are ordinary parts of college. Individually they seem small. Together they shape concentration, energy and long-term risk — and almost nobody notices until something goes wrong."
            />

            <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
              {[
                {
                  head: "Generic advice does not land",
                  body: "Fitness apps and calorie trackers are built for adults with control over their schedule and their kitchen. A hosteller eating from one mess has different constraints.",
                },
                {
                  head: "Effort is the real barrier",
                  body: "Logging every meal fails by week two. Two or three habits, checked off in seconds, survive an exam week — which is the only test that counts.",
                },
                {
                  head: "Accountability is social",
                  body: "Habits stick when the people around you are doing the same thing. A campus cohort, shared challenges and visible events do more than a notification.",
                },
              ].map((c) => (
                <div key={c.head} className="bg-surface p-7">
                  <h3 className="text-lg leading-snug">{c.head}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{c.body}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* ----------------------------------------------------------------- How */}
        <Section id="how" bordered>
          <Container>
            <SectionHeading
              eyebrow="How it works"
              title="Assessment, then a plan you can actually keep."
            />

            <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {steps.map((s) => (
                <li key={s.n} className="border-t-2 border-ink pt-5">
                  <span className="font-display text-sm font-semibold tabular-nums text-accent">
                    {s.n}
                  </span>
                  <h3 className="mt-2 text-lg leading-snug">{s.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </Container>
        </Section>

        {/* ------------------------------------------------------------ Features */}
        <Section bordered>
          <Container>
            <SectionHeading eyebrow="What you get" title="Four things, done properly." />

            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {features.map((f) => (
                <Card key={f.title}>
                  <CardContent className="flex gap-5 p-7">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-accent-line bg-accent-soft">
                      <f.icon className="size-[18px] text-accent" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-lg leading-snug">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </Section>

        {/* -------------------------------------------------------------- Impact */}
        <Section bordered className="bg-surface">
          <Container>
            <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <SectionHeading
                eyebrow="Impact"
                title="Measured against a baseline, or it did not happen."
                description="Every student starts with a baseline check and finishes a cycle with the same questions. That gives the chapter a real before-and-after at campus level, not a download count. Individual answers stay private to the student."
              />

              <div>
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Year-one aims
                </p>
                <p className="mt-1 text-sm text-muted">
                  These are the chapter&apos;s targets, not results. The dashboard will report actual
                  figures once the cohort is live.
                </p>
                <dl className="mt-7 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
                  {aims.map((a) => (
                    <div key={a.label} className="bg-surface p-6">
                      <dt className="sr-only">{a.label}</dt>
                      <dd>
                        <span className="font-display text-4xl font-semibold tracking-tight text-ink tabular-nums">
                          {a.figure}
                        </span>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{a.label}</p>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Container>
        </Section>

        {/* ------------------------------------------------------------ Evidence */}
        <Section id="evidence" bordered>
          <Container>
            <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <SectionHeading
                eyebrow="Evidence"
                title="Where the guidance comes from."
                description="Recommendations shown in the app carry a source tag. Nothing medical is published to students until a named reviewer has checked it against the cited document — the database will not let us mark a recommendation approved without one."
              />

              <ul className="divide-y divide-line border-y border-line">
                {evidence.map((e) => (
                  <li key={e.url}>
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start justify-between gap-6 py-5 transition-colors hover:bg-surface"
                    >
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                          {e.org}
                        </p>
                        <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink group-hover:underline">
                          {e.title}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2 pt-1 text-xs text-muted">
                        {e.year}
                        <ExternalLink className="size-3.5" aria-hidden />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </Section>

        {/* ----------------------------------------------------------- Final CTA */}
        <Section bordered className="bg-ink text-paper">
          <Container className="flex flex-col items-start gap-8 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl leading-tight text-paper sm:text-4xl">
                Start with two minutes. See where you actually stand.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-paper/70">
                Sign in with your college email. You choose what you share, and you can read exactly
                what we store before you agree to anything.
              </p>
            </div>
            <Link
              href="/login"
              className={buttonClasses({
                size: "lg",
                className: "bg-accent text-white hover:bg-accent-hover",
              })}
            >
              Get started
            </Link>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Illustrative product preview built from the real design-system components.
 * Explicitly labelled so it is never mistaken for live campus data.
 */
function HeroPreview() {
  const priorities = [
    { icon: Moon, label: "Sleep", tone: "priority" as const, note: "Bedtime drifts past 1 AM" },
    { icon: Droplets, label: "Hydration", tone: "attention" as const, note: "Under 2L most days" },
    { icon: Activity, label: "Movement", tone: "fair" as const, note: "Long sitting stretches" },
  ];

  return (
    <div className="relative">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <span className="text-xs font-medium text-muted">Your wellness summary</span>
          <Badge tone="neutral">Illustrative</Badge>
        </div>

        <CardContent className="space-y-7 p-7">
          <div className="flex items-center gap-6">
            <ProgressRing value={68} caption="overall" size={104} stroke={9} />
            <div>
              <p className="font-display text-lg leading-snug text-ink">
                A solid base, with three things worth fixing.
              </p>
              <p className="mt-1.5 text-sm text-muted">
                We only show you what to work on next — never every number at once.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Your priorities
            </p>
            <ul className="mt-3 space-y-2">
              {priorities.map((p) => (
                <li
                  key={p.label}
                  className="flex items-center gap-3 rounded-md border border-line bg-paper px-4 py-3"
                >
                  <p.icon className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="text-sm font-medium text-ink">{p.label}</span>
                  <span className="hidden text-sm text-muted sm:inline">{p.note}</span>
                  <Badge tone={p.tone} className="ml-auto">
                    {p.tone}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
