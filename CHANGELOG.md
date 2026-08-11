# Changelog

## [0.2.0] — 2026-08-11 · Phases 0–2

### Documentation
- Full `docs/` set: PRD, architecture, database, auth, scoring engine, roadmap engine, medical
  evidence, admin, security, design system, deployment, build plan.
- `README.md` with Supabase and Vercel setup, and a production checklist.
- `BUILD_STATUS.md` tracking completed, pending and known issues.

### Database
- `0001_init.sql` — 19 enums, 19 tables, check constraints on every health input, indexes.
- `0002_functions_triggers.sql` — `updated_at` triggers, `has_role` / `is_admin` / `has_any_role`,
  `is_email_domain_approved`, `handle_new_user`, `get_leaderboard`. All pin `search_path = ''`.
- `0003_rls.sql` — RLS on every table. Admins deliberately have no row access to health data.
- `0004_seed.sql` — approved domain, four verified evidence sources, five recommendations (all
  `pending_review`), 21 habit templates across seven categories, ten behaviour-based badges.

### Application
- Next.js 16 App Router with React 19, TypeScript strict mode, Tailwind v4.
- Design tokens ("Ink & Saffron") and a component library of 20+ primitives.
- Self-hosted Fraunces and Inter — no third-party font request at runtime.
- Landing page with hero, evidence section and standing medical disclaimer.
- Email OTP authentication with a three-layer approved-domain gate.
- Profile and consent onboarding, storing `consent_version` per student.
- Six-role authorization; only `super_admin` can grant roles.
- Student dashboard and admin overview + roster, all reading live data.
- Scoring engine: `rules.ts` (every threshold, versioned) and `scoring.ts` (pure functions), with a
  15-test suite. BMI is computed but excluded from scoring, priorities and gamification.

### Testing
- `scripts/test-scoring.ts` — 15 assertions on band coverage, monotonicity, BMI isolation,
  priority selection and determinism.
- `supabase/tests/01_policy_tests.sql` — 25 assertions run against a real Postgres, covering
  health-data isolation, admin limits, the domain gate, privilege escalation and points integrity.

### Fixed before release
- `is_email_domain_approved` cast to `citext` while pinning `search_path = ''`; the extension
  operator could not resolve and the function failed to create. Now compared as `text`.
- RLS policies had no `to` role clause, so anonymous visitors evaluated admin-check functions they
  hold no EXECUTE grant on. Anonymous reads failed with "permission denied for function" instead of
  returning no rows, which would have broken the sign-in screen's domain lookup. Every policy now
  names its target role.

### Decisions worth remembering
- No service-role key anywhere. Privileged reads use `SECURITY DEFINER` functions with narrow
  projections.
- Assessment answers stored as explicit typed columns rather than JSON, so aggregate analytics stay
  queryable.
- Wellness scores are stored rather than recomputed, each tagged with `engine_version`, so
  historical summaries stay reproducible when the rules change.
- Design system is hand-rolled with shadcn-compatible props rather than pulling in the CLI.
- Unbuilt routes render as inert "soon" nav items instead of dead links.

### Notes
- Migrations have not yet been applied to a live Supabase project.
- The NationBuilding site returned HTTP 403 to automated requests, so the visual language is
  derived from the written brief. No assets were copied.
