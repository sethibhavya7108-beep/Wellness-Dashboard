# Admin dashboard

Part of the same Next.js application, at `/admin`. There is no separate admin site.

Access requires the `admin` or `super_admin` role, enforced in `admin/layout.tsx` before any admin
markup renders, and again by RLS on every query.

## What an admin can and cannot see

Admins can read profile records — name, email, batch, course, living situation, registration date
and profile completion — because those are needed for user management and segmentation, and are not
health metrics.

Admins **cannot** read assessments, wellness scores, category scores, roadmaps or check-ins. Not
"the UI does not show them": there is no RLS policy granting it. Aggregate health reporting will
arrive as `SECURITY DEFINER` functions that return campus-level totals only, with a minimum cohort
size so a small group cannot be de-anonymised.

## Areas

| Route | Status | Contents |
| --- | --- | --- |
| `/admin` | **built** | Registered accounts, profiles completed, joined this week, events/posts count; distribution by batch and by living situation |
| `/admin/students` | **built** | Searchable, filterable roster (name/email search, batch, living situation, completion) |
| `/admin/analytics` | planned | Aggregate health analytics, baseline vs endline, roadmap and habit completion |
| `/admin/events` | planned | Create, edit, publish, registrations, attendance |
| `/admin/challenges` | planned | Habit templates: category, difficulty, points, source, approval |
| `/admin/content` | planned | Awareness posts: create, edit, publish, unpublish |

Every figure on the built pages is a live count. Nothing is hard-coded.

## Planned overview metrics

Total registered, verified users, assessment completion rate, active users, weekly active users,
habit completion rate, average wellness score, event registrations.

The ones that touch health data depend on the aggregate functions in migration `0005`, which is why
they are not there yet — showing a plausible-looking number before the query exists would be worse
than showing nothing.

## Planned analytics views

- **Student analytics:** breakdowns by batch, course and living situation; assessment completion;
  distribution of priority areas.
- **Health analytics (aggregate only):** average category scores, percentage flagged per category,
  baseline versus endline, roadmap and habit completion.
- **Events:** registrations, attendance, capacity utilisation.

Living situation is a segmentation variable. Any view built on it must not imply that hostel or PG
students are less healthy — the interface should present differences, not verdicts.

## Roles and areas

`src/lib/auth/roles.ts` maps each area to the roles that may reach it. `event_manager`,
`content_manager` and `reviewer` exist so day-to-day work can be delegated without handing out full
admin. `admin` and `super_admin` pass every area check.

Only `super_admin` may grant or revoke roles.

## Rules for building admin pages

1. Read from the database. No hard-coded figures, no placeholder analytics presented as real.
2. Empty is a legitimate result — use `EmptyState`, not a fabricated example row.
3. Filter in SQL, not in JavaScript, so RLS and indexes both still do their job.
4. Never add an RLS policy granting admins row access to health tables. If a metric needs health
   data, write an aggregate function.
5. Tables collapse to cards under `md`.
