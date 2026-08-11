# Build plan

Phases ship in order. A phase is done when `npm run lint`, `npm run typecheck`,
`npm run test:scoring` and `npm run build` all pass, `BUILD_STATUS.md` is updated, and the relevant
document in `docs/` reflects what was built.

Live status is in [`BUILD_STATUS.md`](../BUILD_STATUS.md).

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| **0. Documentation & architecture** ✅ | This documentation set, database schema and migrations, design system foundation | Migrations apply cleanly; docs describe what exists |
| **1. Foundation** ✅ | Next.js, Tailwind, design tokens and primitives, Supabase clients, environment handling, landing page | Production build succeeds; landing page renders on mobile and desktop |
| **2. Authentication** ✅ | Email OTP, three-layer domain gate, profile and consent, role system, route protection, sign-out | A student can register, onboard and reach a real dashboard; a non-approved domain is rejected; `/admin` is closed to non-admins |
| **3. Baseline assessment** | Multi-step form over the seven sections, validation, autosave, BMI calculation, persistence | A completed assessment is stored with `status = 'completed'` and passes every check constraint |
| **4. Scoring** | Wire `scoring.ts` to the assessment; persist `wellness_scores` and category scores; results screen | A student sees a summary and 2–3 priorities; stored scores carry `engine_version` |
| **5. Roadmap engine** | Priority-to-habit assignment, cycle creation, difficulty selection per `ROADMAP_ENGINE.md` | Generation is deterministic; one active roadmap per student |
| **6. Habit tracking** | Daily check-in, streaks, weekly summary, difficulty adaptation | Check-ins are idempotent per habit per day; weekly rules apply correctly |
| **7. Gamification** | Points ledger, badges, leaderboard via `get_leaderboard` | Awards are idempotent; no health metric appears in any ranking |
| **8. Events** | Admin CRUD, publishing, student registration and cancellation, attendance | Capacity and deadlines enforced server-side |
| **9. Content** | Awareness feed, admin editor, publish/unpublish | Students see only published rows |
| **10. Admin dashboard** | Remaining admin areas: analytics, events, challenges, content, user management | Every figure comes from a live query |
| **11. Baseline/endline analytics** | Migration `0005` aggregate functions; comparison views | Aggregates only, with a minimum cohort size |
| **12. Security hardening** | RLS verification with real accounts, server-side authorization audit, error handling review | Two-student read test passes; checklist in `SECURITY.md` cleared |
| **13. Deployment** | Custom domain, production Supabase, production checklist | Checklist in `README.md` fully ticked |

## The order matters

Phases 3 and 4 are the product. Everything after them is engagement machinery that has nothing to
measure until a student has a baseline and a score. Phase 11 is what turns this from a wellness app
into a project with evidence — and it depends on students having completed both a baseline and an
endline, so the cycle length in Phase 5 determines when Phase 11 can produce anything real.

## Rules that apply to every phase

- Read the relevant document before implementing.
- Health thresholds go in `rules.ts` and nowhere else.
- No hard-coded dashboard numbers, no fake buttons, no dead links. A route that is not built stays
  `status: "planned"` in `nav-config.ts`.
- No new dependency without a requirement it actually solves.
- No feature that needs infrastructure beyond GitHub, Vercel and Supabase.
