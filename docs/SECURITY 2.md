# Security

This application handles sensitive health-related information about identifiable students. The
posture below is deliberately stricter than a typical CRUD app.

## Principles

1. **Postgres is the authorization boundary.** Route guards and UI checks are convenience. The
   guarantee that one student cannot read another's assessment is an RLS policy.
2. **Deny by default.** RLS is enabled on every table. An operation with no matching policy is
   denied.
3. **No service-role key.** It is not in `.env.example`, not read anywhere in the codebase, and
   not needed. Privileged reads use `SECURITY DEFINER` functions with narrow projections.
4. **Least data.** Admins get what they need for operations and segmentation, and nothing more.

## Who can read what

| Data | Student | Admin | Anonymous |
| --- | --- | --- | --- |
| Own profile | read/write | — | — |
| Other profiles | no | read (name, batch, course, living situation) | no |
| Assessments, wellness scores, category scores | own only | **no row access** | no |
| Roadmaps, roadmap habits, check-ins | own only | **no row access** | no |
| Points ledger | own only | read/write | no |
| Badges earned | own only | no | no |
| Leaderboard | via `get_leaderboard` (name, batch, points, rank) | same | no |
| Habit templates | approved and active only | full | no |
| Recommendations | approved only | reviewers write | no |
| Events | published and completed | full (event managers) | published only |
| Content | published only | full (content managers) | published only |
| Analytics events | insert own only | read | no |

**Administrators have no row-level access to health data.** That is the deliberate reading of "do
not expose sensitive individual health data unnecessarily". Aggregate reporting will be served by
`SECURITY DEFINER` functions returning campus-level totals with a minimum cohort size, added in the
analytics phase. Until those exist, the admin dashboard shows registration and segmentation figures
and says plainly why there are no health numbers.

## Privilege escalation

Writes to `user_roles` are restricted to `super_admin`. An ordinary admin cannot grant themselves a
role. The first super admin is granted by hand in SQL.

`has_role`, `is_admin` and `has_any_role` are `SECURITY DEFINER` so that a policy on `user_roles`
can ask "is this user an admin?" without recursing into itself.

## Function hardening

Every function pins `search_path = ''` and fully qualifies identifiers, so a schema on the caller's
search path cannot shadow a table or operator. Execute permission is revoked from `public` and
`anon`, then granted only to the roles that need it. `is_email_domain_approved` is the single
exception granted to `anon` — it reveals only whether a domain is on the allow-list, which the
login screen displays anyway.

## Input validation

Every mutation goes through a Zod schema in a Server Action. The browser form is a convenience.
Beyond that, check constraints on the tables mean an impossible value cannot be stored even if both
layers were bypassed.

## Other measures

- `?next=` values pass through `safeNext()` — same-origin absolute paths only.
- Sign-out is POST-only.
- `supabase.auth.getUser()` is used server-side, which validates the token. `getSession()` alone is
  never trusted on the server.
- `profiles.id`, `email` and `created_at` are frozen by a trigger.
- `points_transactions` has no student INSERT policy — nobody can mint their own points. Awards
  will be written by `SECURITY DEFINER` functions in the gamification phase.
- A partial unique index on the points ledger makes awards idempotent.
- `analytics_events.properties` must never carry health values. Keep it to identifiers, counts and
  segmentation fields.
- Fonts are self-hosted, so no third-party sees a student's IP on page load.

## Verifying RLS

`supabase/tests/01_policy_tests.sql` is a 25-assertion suite covering exactly these guarantees:
health-data isolation between students, the limits on admin access, the domain gate, privilege
escalation, points integrity, and the check constraints. Every line of its output should read
`PASS`. See `supabase/tests/README.md` for how to run it against a throwaway Postgres or a Supabase
branch.

Run it after any change to a policy or a migration. It has already caught two bugs that would have
reached production:

1. `is_email_domain_approved` cast to `citext` while pinning `search_path = ''`, so the extension's
   operator could not resolve and the function failed to create.
2. Policies without a `to` role clause were evaluated for anonymous visitors, so an anonymous read
   of a public table executed an admin-check function that `anon` has no EXECUTE grant on. The
   query failed with "permission denied for function" rather than returning no rows — this would
   have broken the sign-in screen's domain lookup. Every policy now names its target role.

The second is worth remembering as a general rule: **in this schema, a policy without a `to` clause
is a bug.**

## Known gaps

- Aggregate analytics functions with a minimum cohort size are not yet written.
- No re-consent prompt when the consent version changes.
- No self-service account deletion.
- No audit log of admin actions.
- Rate limiting relies on Supabase's email limits.

## Reporting

Security concerns should go to the chapter's technical lead before any public disclosure.
