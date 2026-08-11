# Architecture

```
Browser
   │
   ▼
Next.js on Vercel ──── proxy.ts (session refresh + coarse route gate)
   │                        │
   │                        ▼
   │                 Server Components / Server Actions / Route Handlers
   ▼
Supabase
   ├── Postgres (schema in supabase/migrations)
   ├── Auth (email OTP)
   ├── Row Level Security (the real authorization boundary)
   └── Storage (event banners, content images — not yet used)

GitHub → Vercel automatic deployment
```

One Next.js application serves both the student experience and the admin dashboard. There is no
separate admin site, no separate backend service and no CMS.

## Directory map

```
src/
  app/
    page.tsx                  Landing page (static)
    login/                    Email entry, code entry, server actions
    auth/callback/            Sign-in link handler
    auth/sign-out/            POST-only sign out
    onboarding/               Profile + consent
    (app)/                    Student area — layout enforces auth + onboarding
      dashboard/
    admin/                    Admin area — layout enforces admin role
      students/
  components/
    ui/                       Design system primitives
    site/                     Marketing and auth chrome
    app/                      Signed-in shell, navigation, stat cards
  lib/
    env.ts                    Lazy, validated environment access
    utils.ts                  cn(), date and number helpers
    auth/                     Domains, roles, consent text, session helpers
    supabase/                 Browser, server and proxy clients + database types
    wellness/                 rules.ts (thresholds) and scoring.ts (pure functions)
supabase/migrations/          Ordered SQL, the source of truth for the schema
scripts/                      Scoring test suite
docs/                         This documentation set
```

## Decisions and why

**Route groups over separate apps.** `(app)` and `admin` each have a layout that performs the
authorization check server-side. A page cannot forget to check, because its layout already did.

**RLS is the authorization boundary; everything else is UX.** `proxy.ts` redirects signed-out
visitors for speed and tidiness, and layouts re-check on the server. But the guarantee that one
student cannot read another's assessment lives in Postgres policies. A bug in a React component
cannot break it.

**No service-role key anywhere.** Privileged reads use `SECURITY DEFINER` functions with narrow,
explicit projections (`get_leaderboard` returns name, batch and points — nothing else). This
removes the single most common way a Supabase project leaks data.

**Hand-rolled design system, shadcn-compatible API.** The spec allows shadcn/ui "where useful".
Adding the CLI and its dependency tree to get a button was not useful. The primitives in
`components/ui` take the same props as their shadcn equivalents, so a shadcn component can be
dropped in later without a refactor.

**No charting library yet.** The only visualisations so far are a progress ring and distribution
bars, both a few lines of inline SVG and CSS. Recharts goes in when a chart genuinely beats a
number or a table — not before.

**Self-hosted fonts.** `next/font/local` with Fraunces and Inter woff2 files in `src/fonts`. No
runtime request to Google, no build-time dependency on fonts.googleapis.com, correct fallback
metrics so there is no layout shift.

**Thresholds live in exactly one file.** `lib/wellness/rules.ts` holds every health number in the
product. No component, route or query hard-codes one. Changing a threshold after medical review is
a one-file edit plus a version bump.

**Explicit assessment columns, not JSON.** Aggregate analytics — average sleep by batch, percentage
flagged by category — need real columns with real constraints. A JSON blob would have been faster
to write and much worse to query.

**Derived scores are stored.** `wellness_scores` duplicates what `scoring.ts` can recompute. That
is deliberate: the rules file will change after medical review, and a student's historical summary
must stay reproducible. Every stored score carries the `engine_version` that produced it.

**Analytics in our own table.** `analytics_events` is a generic `(name, properties jsonb)` shape.
It answers operational questions today via SQL, and it can be mirrored to an external tool later
without a schema change. No third-party analytics is installed.

## Request lifecycle

1. `proxy.ts` refreshes the Supabase session cookie and redirects signed-out requests for
   protected paths to `/login?next=…`.
2. The route group layout calls `requireUser` / `requireOnboardedUser` / `requireAdmin`, which use
   `supabase.auth.getUser()` — a real token validation, not a cookie read.
3. The page runs its queries with the anon key under the caller's identity. RLS decides what comes
   back.
4. Mutations go through Server Actions that re-validate every field with Zod before writing.

## Adding a feature

1. Read the relevant document in `docs/` first.
2. If it needs schema, add a new numbered migration — never edit an applied one — and update
   `docs/DATABASE.md` and `src/lib/supabase/database.types.ts`.
3. If it needs a health threshold, it belongs in `rules.ts`.
4. Reuse `components/ui` primitives. Add a new primitive only when two features need it.
5. Flip the route's `status` in `components/app/nav-config.ts` from `planned` to `live` in the same
   commit that ships it.
6. Update `BUILD_STATUS.md` and `CHANGELOG.md`.
