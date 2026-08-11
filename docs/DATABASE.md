# Database

Source of truth: `supabase/migrations/`, applied in filename order. Never edit a migration that
has run against a real project — add a new numbered one.

## Conventions

- UUID primary keys, `gen_random_uuid()` by default.
- `created_at timestamptz not null default now()` everywhere; `updated_at` on mutable tables,
  maintained by the `set_updated_at` trigger.
- Foreign keys everywhere, with deliberate delete behaviour: `cascade` for data owned by a user,
  `restrict` where deleting would orphan history, `set null` for soft references like `created_by`.
- Enums for closed sets, so a typo is a database error rather than a bad row.
- Check constraints on every numeric health input, so an impossible value cannot be stored even if
  application validation is bypassed.
- Case-insensitive `citext` for email and domain.

## Tables

### Identity and access

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `profiles` | One row per user, 1:1 with `auth.users` | `email` (unique), `batch_year`, `program`, `living_situation`, `consent_accepted_at`, `consent_version`, `profile_completed_at` |
| `user_roles` | Role grants, composite PK `(user_id, role)` | `role`, `granted_by` |
| `approved_email_domains` | Registration allow-list | `domain` (unique), `is_active` |

`profiles.id`, `email` and `created_at` are frozen after insert by the
`protect_profile_identity` trigger — email is the student's identity and must not be client-editable.

### Assessment and scoring

| Table | Purpose |
| --- | --- |
| `assessments` | One row per baseline / endline / checkpoint. Explicit typed columns, not JSON |
| `wellness_scores` | Overall score, BMI and engine version for one assessment (1:1) |
| `wellness_category_scores` | Per-category raw value, normalized score, status, priority rank |

A partial unique index allows exactly one **completed** assessment per user per kind, while leaving
any number of in-progress drafts. `assessments_completed_shape` keeps `status` and `completed_at`
consistent with each other.

### Roadmap and habits

| Table | Purpose |
| --- | --- |
| `habit_templates` | The approved habit library the engine draws from |
| `roadmaps` | A 2–4 week cycle for one student; partial unique index enforces one active roadmap per user |
| `roadmap_habits` | The habits assigned in a cycle, with the difficulty actually given |
| `habit_checkins` | One row per habit per day; `unique (roadmap_habit_id, checkin_date)` makes check-ins idempotent |

### Gamification

| Table | Purpose |
| --- | --- |
| `points_transactions` | Append-only ledger. A partial unique index on `(user_id, reason, ref_table, ref_id)` makes awards idempotent — the same check-in cannot be paid twice |
| `badges` / `user_badges` | Behaviour-based achievements only |

`badges.criteria_type` values in use: `checkins_total`, `streak_days`, `assessments_completed`,
`roadmaps_completed`, `endline_completed`, `events_attended`. **No badge may reference BMI, weight,
stress or wellness score.**

### Events, content, analytics

| Table | Purpose |
| --- | --- |
| `events` | Admin-managed, slug-addressed, with capacity and registration window |
| `event_registrations` | `unique (event_id, user_id)`; carries `attended` for post-event marking |
| `content` | Awareness feed. `content_published_shape` forbids `status = 'published'` without `published_at` |
| `sources` / `recommendations` | Evidence library; see `MEDICAL_EVIDENCE.md` |
| `analytics_events` | Generic `(name, properties jsonb)` product events |

## Functions

| Function | Security | Purpose |
| --- | --- | --- |
| `has_role(uuid, app_role)` | definer | Role check without RLS recursion |
| `is_admin(uuid)` | definer | True for `admin` or `super_admin` |
| `has_any_role(app_role[])` | definer | Area role check; admins always pass |
| `is_email_domain_approved(text)` | definer | Allow-list check, callable by `anon` |
| `handle_new_user()` | definer | On `auth.users` insert: rejects unapproved domains, creates the profile and the `student` role |
| `get_leaderboard(int, int)` | definer | Returns name, batch, points and rank only |
| `set_updated_at()` / `protect_profile_identity()` | — | Triggers |

Every function pins `search_path = ''` and fully qualifies identifiers.

## Indexes

Beyond primary and unique keys: `profiles(batch_year)`, `profiles(living_situation)`,
`profiles(created_at desc)`, `assessments(user_id, kind, created_at desc)`,
`habit_checkins(user_id, checkin_date desc)`, `points_transactions(user_id, created_at desc)`,
`events(status, starts_at desc)`, `content(status, published_at desc)`,
`habit_templates(category, difficulty, is_active, approval_status)`.

## Derived data

Stored deliberately: `wellness_scores` and `wellness_category_scores`. The rules file changes; a
student's historical summary must not. Every row carries the `engine_version` that produced it.

Not stored: total points (summed from the ledger), streak length (derived from check-in dates),
BMI category (derived from the value at read time).

## Regenerating types

`src/lib/supabase/database.types.ts` is hand-maintained to match these migrations. Once your
project is live, replace it with generated output:

```bash
SUPABASE_PROJECT_ID=<ref> npm run db:types
```

## Planned migrations

`0005` will add the aggregate analytics functions for the admin dashboard: campus-level category
averages, percentage flagged per category, and baseline-versus-endline comparison. They will be
`SECURITY DEFINER`, return only aggregates, and enforce a minimum cohort size so a small group
cannot be de-anonymised.
