# Build status

Last updated: 2026-08-11 · Phases 0–4 complete.

Verified on this build:

- `npm run lint` — clean
- `npm run typecheck` — clean
- `npm run test:scoring` — 15/15 passing
- `npm run test:db` — 25/25 passing (migrations executed against a real Postgres 16, policies
  exercised as student, admin and anonymous)
- `npm run build` — production build succeeds
- Dev server serves every route; `/dashboard` and `/admin` correctly redirect when signed out

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

---

## Live project

Supabase project `znilramhytccnwbansda`: migrations `0001`–`0004` applied, 19 tables, RLS on all,
38 policies, seed data present. Authentication verified end to end against it.

---

## In progress

Nothing. Phases 0–4 are closed.

---

## Pending

| Phase | Scope |
| --- | --- |
| 5 | Roadmap engine — priority-to-habit assignment, cycles, difficulty |
| 6 | Habit tracking — daily check-in, streaks, weekly summary, adaptation |
| 7 | Gamification — points ledger, badges, leaderboard |
| 8 | Events — admin CRUD, registration, attendance |
| 9 | Content — awareness feed, admin editor |
| 10 | Remaining admin areas |
| 11 | Migration `0005`: aggregate analytics, baseline vs endline |
| 12 | Security hardening and RLS verification against a live project |
| 13 | Custom domain and production deployment |

---

## Known issues and open decisions

**Blocking a live run**
1. **No Supabase project connected.** The migrations have been executed and exercised against a
   local Postgres 16 with a Supabase shim, so the SQL and the policies are proven. What is still
   unverified is the live loop: a real OTP email arriving, `verifyOtp` setting a session, and the
   `auth.users` trigger firing inside Supabase's own signup transaction.
2. **Email template needs `{{ .Token }}`.** Without it the six-digit code screen has nothing to
   verify and only the sign-in link works. Steps are in the README.

**Design and product**
3. **NationBuilding site was unreachable** (HTTP 403 to automated requests), so the visual language
   comes from the written brief. Tokens are in one file if the real brand differs.
4. **BMI bands are unreviewed.** General WHO adult cut-offs are in `rules.ts`, flagged
   `pending_medical_review`. Cut-offs for South Asian populations are debated. No interpretation
   should be shown to students until a reviewer signs off.
5. **All seeded recommendations are `pending_review`.** Students currently see no medical claims,
   which is the correct default. A reviewer must approve them before anything shows.
6. **Scoring thresholds are initial product logic**, not medical criteria. They are conservative and
   deliberately easy to change.

**Deliberate omissions**
7. Admins have no row access to health data. Aggregate functions land in Phase 11 rather than
   loosening RLS.
8. No charting library. Inline SVG covers current needs; Recharts goes in when a chart beats a
   number.
9. `/roadmap`, `/habits`, `/progress`, `/events`, `/content`, `/leaderboard` appear in the nav as
   inert "soon" items rather than dead links. Flip `status` in `nav-config.ts` when each ships.
10. No re-consent prompt on version change, no self-service deletion, no admin audit log.
