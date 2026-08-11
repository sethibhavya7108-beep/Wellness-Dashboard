# Build status

Last updated: 2026-08-11 · Phases 0–13 built, with the limits below.

Verified on this build:

- `npm run lint` — clean
- `npm run typecheck` — clean
- `npm run test:scoring` — 15/15 passing
- `npm run test:roadmap` — 19/19 passing
- `npm run test:db` — 25/25 passing (against a real Postgres 16, exercised as student, admin and
  anonymous). Predates migrations `0005`–`0008`; those functions have no suite yet.
- `npm run build` — production build succeeds, 21 routes
- Migrations `0001`–`0008` applied to the live Supabase project and verified there
- Security audit run against the live project — see `docs/SECURITY.md`

**What has not been verified.** Every screen behind sign-in has been type-checked and built, but
not walked through by a signed-in user. Custom SMTP is not configured, so the built-in sender only
reaches Supabase organisation members — which makes a real student journey impossible to test right
now. Treat the student-facing flows as written and compiling, not as proven.

---

## Completed

### Phase 0 — Documentation and architecture
- Full documentation set in `docs/` (PRD, architecture, database, auth, scoring, roadmap, evidence,
  admin, security, design system, deployment, build plan).
- Database schema across four migrations: 19 tables, 19 enums, check constraints on every health
  input, indexes, triggers, `SECURITY DEFINER` helpers, RLS on every table, seed data.
- Hand-maintained `database.types.ts` matching the migrations.

### Phase 1 — Foundation
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4.
- Design tokens ("Ink & Saffron") as the single source of colour, type, radii and spacing.
- Design system primitives: button, card, form controls, badge, alert, skeleton, empty state,
  progress bar, progress ring, stepper, toast, layout, section heading.
- Self-hosted Fraunces + Inter via `next/font/local`.
- Lazy validated environment handling; browser, server and proxy Supabase clients.
- Landing page: hero, why preventive health, how it works, features, impact aims, evidence, final
  call to action, footer with standing disclaimer.
- Scoring engine (`rules.ts` + `scoring.ts`) with a 15-test suite. Built early because Phases 4–6
  all depend on it and it is pure logic.

### Phase 2 — Authentication
- Email OTP sign-in with code entry and sign-in link, plus resend.
- Approved-domain gate enforced at three layers: client hint, server action, database trigger.
- Profile setup with consent capture (`consent_version` stored per profile).
- Role system with six roles; area-to-role mapping; `super_admin`-only role grants.
- Server-side route protection via route-group layouts; `proxy.ts` session refresh; POST-only
  sign-out; open-redirect protection on `?next=`.
- Student dashboard reading real profile, event and content data with empty states.
- Admin overview and student roster, every figure from a live query.

### Phase 3 — Baseline assessment
- Seven-section check with per-section autosave into an open draft.
- Questions declared once in `assessment-fields.ts`, read by both the form and the server
  validator, so what is shown and what is accepted cannot drift. Numeric bounds mirror the CHECK
  constraints in `0001_init.sql`.
- Every question optional; skipped categories are excluded from the score. Completion is refused
  only below `MIN_PRIORITIES` answered categories.

### Phase 4 — Scoring and results
- Completing an assessment scores it and writes `wellness_scores` plus one row per category, each
  tagged with `engine_version`.
- Writes are on-conflict-do-nothing: the unique keys make a repeat a no-op, and neither table
  grants UPDATE to students.
- Results screen: overall score, every answered area, the 2–3 priorities, and BMI as context
  carrying its pending-review status.

### Phase 5 — Roadmap engine
- Deterministic generation: same score plus same library always yields the same cycle. Nothing in
  `roadmap.ts` reads a clock, a random number or the network.
- One habit per priority category, capped at three, starting difficulty from the category status.
  Prefers a habit the student has not been given before.
- Difficulty, target and points are copied onto the roadmap habit, so editing a template later does
  not rewrite what a student was actually asked to do.
- 19 tests in `scripts/test-roadmap.ts`.

### Phase 6 — Habit tracking
- Daily check-in through `log_habit_checkin`, which verifies the habit belongs to the caller and
  the date falls inside the cycle. Idempotent per habit per day.
- Streaks from `current_streak_days`, which resolves its own argument to null unless it equals
  `auth.uid()` — without that it would read any student's history from an id alone.

### Phase 7 — Gamification
- Points ledger with a partial unique index on the reference, so an award cannot be duplicated.
- Students hold no INSERT on `points_transactions`; every award goes through a definer function.
- Badges are behaviour-only. No badge references BMI, weight, stress or any score.

### Phase 8 — Events
- Capacity, deadline and publication state enforced inside the database, so a closed event stays
  closed even against a direct API call.
- Attendance requires `event_manager` or admin, checked in the function body.

### Phase 9 — Content
- Awareness feed and detail pages. Students read only `status = 'published'`, enforced by policy.

### Phase 11 — Aggregate analytics (`0007`)
- Five definer functions: participation, category averages, score distribution, habit engagement,
  and the baseline-versus-endline comparison.
- Each requires `is_admin()` and withholds its result below a cohort of five — an average over
  three people stops being anonymous once a batch filter is applied.
- The comparison is within-subject: only students with both checks are counted.

### Phase 12 — Security hardening (`0008`)
- Closed the RPC surface on three trigger functions that were reachable through the default PUBLIC
  grant. All 13 triggers still fire.
- Audited every health table on the live project: RLS on, and no policy anywhere calls `is_admin`,
  `has_role` or `has_any_role`. There is no privileged read path to a student's health data.
- Full findings, including what was accepted and why, in `docs/SECURITY.md`.

### Phase 13 — Deployment preparation
- Production checklist in `README.md` rewritten against the live project, marking what is done and
  what is blocked.

---

## Live project

Supabase project `znilramhytccnwbansda`: migrations `0001`–`0008` applied. 19 tables, RLS on every
one, seed data present, security audit passed. Authentication verified end to end.

---

## Pending

| Phase | Scope |
| --- | --- |
| 10 | Admin content management, challenges, and user role management |

Admin analytics and events are built. The remaining admin areas were deferred deliberately.

---

## Known issues and open decisions

**Blocking students using this**
1. **No custom SMTP.** The built-in Supabase sender only delivers to members of the Supabase
   organisation and is capped at a few emails an hour. No student outside the organisation can
   receive a sign-in email, so this is the single blocker to a real pilot. Resend or SendGrid.
2. **Email template needs `{{ .Token }}`.** Supabase will not allow template edits until custom
   SMTP is configured, so this is blocked behind (1). Until then the six-digit code screen has
   nothing to verify and only the sign-in link works — the app handles that path correctly.
3. **`gmail.com` is on the approved-domain list.** Added to test authentication, because the
   built-in sender cannot reach an `@sscbs.du.ac.in` address. Remove before any real use:
   `delete from public.approved_email_domains where domain = 'gmail.com';`

**Unverified**
4. **No signed-in walkthrough.** Everything behind the login compiles and type-checks, and the
   database functions were exercised directly, but no one has completed a baseline, generated a
   roadmap and logged a check-in through the interface. Point (1) is why.
5. **`npm run test:db` predates `0005`–`0008`.** The 25 policy assertions still pass, but nothing
   in that suite covers check-ins, points, events or the analytics functions.

**Design and product**
6. **NationBuilding site was unreachable** (HTTP 403 to automated requests), so the visual language
   comes from the written brief. Tokens are in one file if the real brand differs.
7. **BMI bands are unreviewed.** General WHO adult cut-offs are in `rules.ts`, flagged
   `pending_medical_review`. Cut-offs for South Asian populations are debated. The results screen
   states this on the card itself. No interpretation should reach students until a reviewer signs
   off — or leave BMI off entirely.
8. **All seeded recommendations are `pending_review`.** Students currently see no medical claims,
   which is the correct default. A reviewer must approve them before anything shows.
9. **Scoring thresholds are initial product logic**, not medical criteria. They are conservative and
   deliberately easy to change.

**Deliberate omissions**
10. Admins have no row access to health data. The aggregate functions in `0007` are the entire
    reporting surface; RLS was never loosened.
11. No charting library. Inline SVG covers current needs; Recharts goes in when a chart beats a
    number.
12. `AREA_ROLES` grants `event_manager`, `content_manager` and `reviewer` access to specific admin
    areas, but `/admin` gates on `requireAdmin`, so those entries are inert. Widening that gate is
    an access-control decision that has not been taken.
13. No re-consent prompt on version change, no self-service deletion, no admin audit log.
14. Roadmap weekly adaptation is written and tested as pure logic (`weeklyOutcome`), but nothing
    schedules it — there is no cron. It runs when a student's week is evaluated on visit.
