# Campus Wellness

A preventive-health platform for students of Shaheed Sukhdev College of Business Studies,
built by the NationBuilding Impact Chapter.

A student signs in with their college email, completes a short baseline check, and receives a
personalised roadmap of two or three small daily habits. Check-ins build streaks and points;
campus events and challenges run alongside. At the end of a cycle the student retakes the check,
which gives the chapter a real before-and-after at campus level.

**Health status is never rewarded — only health behaviour.** Leaderboards run on habits completed
and events attended. BMI, weight, stress and wellness scores never appear in any ranking, and are
readable only by the student they belong to.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, design tokens in `src/app/globals.css` |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth, email OTP, approved-domain allow-list |
| Hosting | Vercel |
| Charts | None yet — inline SVG covers current needs |

Runtime dependencies are deliberately few: `@supabase/supabase-js`, `@supabase/ssr`, `zod`,
`clsx`, `tailwind-merge`, `lucide-react`, `server-only`. Fonts are self-hosted, so the app makes
no third-party requests at runtime.

---

## Local setup

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
npm run dev                    # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon key; all access still passes through RLS |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical origin used to build sign-in links |

There is no service-role key in this project, by design. See `docs/SECURITY.md`.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com). Note the project URL and the anon
   key from **Project Settings → Data API**.

2. Run the migrations in order. Either paste each file into the SQL Editor, or use the CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   | File | Contents |
   | --- | --- |
   | `0001_init.sql` | Extensions, enums, tables, constraints, indexes |
   | `0002_functions_triggers.sql` | Authorization helpers, new-user provisioning, leaderboard |
   | `0003_rls.sql` | Row Level Security policies for every table |
   | `0004_seed.sql` | Approved domains, evidence sources, habit library, badges |

3. **Turn on email OTP.** In **Authentication → Providers → Email**, make sure email is enabled.

4. **Add the code to the email template.** In **Authentication → Email Templates → Magic Link**,
   include the six-digit token alongside the link:

   ```html
   <p>Your Campus Wellness sign-in code is <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">click here to sign in</a>.</p>
   ```

   Without `{{ .Token }}` the code entry screen has nothing to verify against, and students can
   only use the link.

5. **Set the redirect URLs.** In **Authentication → URL Configuration**, set the Site URL to your
   production domain and add `http://localhost:3000/**` plus your Vercel preview pattern to
   Redirect URLs.

### Adding another college domain

Registration is restricted to domains in the `approved_email_domains` table. Adding one is a data
change, not a deploy:

```sql
insert into public.approved_email_domains (domain, label)
values ('example.du.ac.in', 'Example College');
```

### Making someone an admin

Roles live in `user_roles`. Grant the first super admin by hand after they have signed in once:

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin' from public.profiles where email = 'organiser@sscbs.du.ac.in';
```

Only a `super_admin` can grant roles thereafter — an ordinary admin cannot escalate themselves.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:scoring` | Scoring engine test suite (15 assertions) |
| `npm run test:db` | RLS and constraint test suite (25 assertions, needs `DATABASE_URL`) |
| `npm run db:types` | Regenerate `database.types.ts` (needs `SUPABASE_PROJECT_ID`) |

`npm run test:db` writes rows, so point it at a scratch database — never production. See
`supabase/tests/README.md`.

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import it in Vercel. The framework preset is detected automatically.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` to
   the project's environment variables.
4. Add your custom domain under **Settings → Domains**, then set `NEXT_PUBLIC_SITE_URL` to it. No
   Vercel URL is hard-coded anywhere in the codebase.
5. Add the production and preview URLs to Supabase's redirect allow-list.

Full detail in `docs/DEPLOYMENT.md`.

---

## Production checklist

- [ ] Migrations `0001`–`0004` applied to the production project
- [ ] `{{ .Token }}` present in the Magic Link email template
- [ ] Site URL and redirect URLs configured in Supabase
- [ ] Environment variables set in Vercel; `.env.local` not committed
- [ ] At least one `super_admin` granted
- [ ] `npm run build`, `npm run lint`, `npm run typecheck` and `npm run test:scoring` all pass
- [ ] `npm run test:db` passes against a scratch database with the migrations applied
- [ ] Every recommendation intended for students reviewed and marked `approved`
- [ ] Consent text in `src/lib/auth/consent.ts` read and approved by the chapter
- [ ] RLS verified: sign in as two students and confirm neither can read the other's data

---

## Documentation

| Document | Covers |
| --- | --- |
| [`docs/PRD.md`](docs/PRD.md) | Product scope, users, principles |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Structure and the decisions behind it |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schema, relationships, conventions |
| [`docs/AUTH.md`](docs/AUTH.md) | Sign-in flow, domain gate, roles |
| [`docs/SCORING_ENGINE.md`](docs/SCORING_ENGINE.md) | Categories, bands, overall score |
| [`docs/ROADMAP_ENGINE.md`](docs/ROADMAP_ENGINE.md) | Priority selection, habits, adaptation |
| [`docs/MEDICAL_EVIDENCE.md`](docs/MEDICAL_EVIDENCE.md) | Sources, review workflow, what we will not claim |
| [`docs/ADMIN.md`](docs/ADMIN.md) | Admin areas and what admins can and cannot see |
| [`docs/SECURITY.md`](docs/SECURITY.md) | RLS posture, threat model, secrets |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Tokens, components, usage rules |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel, domains, environments |
| [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) | Phases and their exit criteria |
| [`BUILD_STATUS.md`](BUILD_STATUS.md) | What is done, in progress, pending |

---

Campus Wellness supports everyday habits. It does not diagnose, treat or give medical advice.
