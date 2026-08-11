# Database tests

25 assertions covering the guarantees that RLS and the check constraints are supposed to make:
signup provisioning, the domain gate, health-data isolation between students, the limits on what an
admin can read, privilege escalation, points integrity, and the constraints that stop impossible or
unevidenced rows being stored.

These are the tests that matter most in this project. A React bug shows a wrong number; an RLS bug
shows one student another student's health data.

## Running against a throwaway Postgres

`00_local_shim.sql` creates the small parts of Supabase the migrations depend on — the `auth`
schema, an `auth.users` table, `auth.uid()`, and the `anon` and `authenticated` roles — so the
migrations can run on a plain Postgres 16.

```bash
createdb cw
psql -d cw -v ON_ERROR_STOP=1 -f supabase/tests/00_local_shim.sql
for f in supabase/migrations/*.sql; do psql -d cw -v ON_ERROR_STOP=1 -f "$f"; done
psql -d cw -v ON_ERROR_STOP=1 -f supabase/tests/01_policy_tests.sql
```

Every line of output should begin with `PASS`.

**Do not run `00_local_shim.sql` against a Supabase project.** Supabase provides all of this
already; the shim would collide with it.

## Running against a Supabase branch

Point `DATABASE_URL` at a preview branch or a scratch project that already has the migrations
applied, then:

```bash
DATABASE_URL="postgresql://…" npm run test:db
```

The test file writes rows, so use a scratch database — never production.

## Two bugs this suite has already caught

1. `is_email_domain_approved` cast to `citext` while pinning `search_path = ''`. The extension's
   operator was not resolvable, so the function failed to create. Now compared as `text`.
2. Policies without a `to` role clause were evaluated for anonymous visitors, which meant an
   anonymous read of a public table executed an admin-check function that `anon` has no EXECUTE
   grant on. The query failed with "permission denied for function" instead of returning no rows —
   which would have broken the sign-in screen's domain lookup in production. Every policy now names
   its target role.

## Adding a test

Follow the existing shape: set the role and the JWT claim inside a transaction, assert, then roll
back.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<uuid>"}', true);

select case when count(*) = 0 then 'PASS' else 'FAIL' end
  || ' NN. description of the guarantee'
from public.some_table;
rollback;
```

Every new table added to the schema needs at least one test proving a student cannot read another
student's row.
