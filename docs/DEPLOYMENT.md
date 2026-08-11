# Deployment

```
GitHub → Vercel → Next.js → Supabase
```

No other infrastructure. No separate backend, no CMS, no third-party analytics, no email provider
beyond Supabase Auth.

## Environments

| Environment | Origin | Supabase |
| --- | --- | --- |
| Local | `http://localhost:3000` | Your development project |
| Vercel preview | Generated per branch | Development project |
| Production | Your custom domain | Production project |

Use two Supabase projects once real students are registering. Preview deployments pointing at
production data is how test rows end up in an impact report.

## First deploy

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import it. Next.js is detected; no build settings needed.
3. Add environment variables under **Settings → Environment Variables**:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
   | `NEXT_PUBLIC_SITE_URL` | Production origin (set for Production only) |

   Leave `NEXT_PUBLIC_SITE_URL` unset for Preview so each preview builds links against its own URL.

4. Deploy.

## Custom domain

1. **Settings → Domains** in Vercel, add the domain, follow the DNS instructions.
2. Set `NEXT_PUBLIC_SITE_URL` to `https://your-domain` and redeploy.
3. Add the domain to Supabase **Authentication → URL Configuration**:
   - Site URL: `https://your-domain`
   - Redirect URLs: `https://your-domain/**`, `http://localhost:3000/**`, and your Vercel preview
     pattern such as `https://*-yourteam.vercel.app/**`

No Vercel URL is hard-coded anywhere. `siteUrl()` in `src/lib/env.ts` prefers
`NEXT_PUBLIC_SITE_URL`, then Vercel's own project URL, then localhost.

## Database migrations

Apply in order, either through the SQL Editor or the CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

Migrations are forward-only. Never edit one that has been applied — add a new numbered file.

Before the first real sign-up, confirm: the four migrations applied, `{{ .Token }}` present in the
Magic Link template, redirect URLs configured, and at least one `super_admin` granted.

## Pre-deploy checks

```bash
npm run lint
npm run typecheck
npm run test:scoring
npm run build
```

All four must pass. `npm run build` is the one that catches server/client boundary mistakes.

## Secrets

`.env.local` is gitignored and must stay that way. There is no service-role key in this project.
If you ever add one, it belongs in a server-only module and must never appear in a
`NEXT_PUBLIC_*` variable.

Rotate the anon key from the Supabase dashboard if it is ever committed; RLS limits the damage, but
rotate anyway.

## After deploying

- Sign in with a real `@sscbs.du.ac.in` address and complete onboarding.
- Confirm a non-approved domain is rejected.
- Confirm `/dashboard` redirects to `/login` when signed out.
- Confirm `/admin` redirects a non-admin to `/dashboard`.
- Sign in as a second student and confirm neither can read the other's data.

## Rollback

Vercel keeps every deployment; promote a previous one from the dashboard. Database migrations do
not roll back automatically — write a forward migration that undoes the change.
