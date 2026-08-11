# Authentication and authorization

## Sign-in flow

```
/login          enter college email
   │            client hint → server action re-checks domain → signInWithOtp
   ▼
/login/verify   enter the 6-digit code  (or click the link in the same email)
   │            verifyOtp → session cookie set
   ▼
/onboarding     profile + consent, once
   │
   ▼
/dashboard
```

The emailed message contains both a six-digit code and a sign-in link. The code is handled by
`verifyOtp` in the server action; the link is handled by `/auth/callback`, which accepts both the
`token_hash` + `type` and the `code` (PKCE) parameter shapes.

The Supabase **Magic Link** template must include `{{ .Token }}` for code entry to work. Setup
instructions are in the README.

## The approved-domain gate

Registration is restricted to domains in `approved_email_domains`. The list is data, not code, so
adding a DU college is an insert, not a deploy.

Enforcement happens three times:

| Layer | Where | Purpose |
| --- | --- | --- |
| 1. Client | `login-form.tsx` | Instant feedback while typing. A hint only |
| 2. Server | `requestOtp` action calls `is_email_domain_approved` | Blocks the OTP send |
| 3. Database | `handle_new_user()` trigger on `auth.users` | Aborts account creation |

Layer 3 is the one that matters. Even if someone called the Supabase Auth API directly, bypassing
this application entirely, the signup transaction fails.

## Sessions

- Cookie-based, via `@supabase/ssr`.
- `proxy.ts` refreshes the session on every matched navigation.
- Server code always uses `supabase.auth.getUser()`, which validates the JWT with Supabase.
  `getSession()` alone is never trusted on the server — it reads the cookie without verifying it.
- `getAuthContext()` is wrapped in React `cache`, so a layout and its page share one round trip.
- Sign-out is a `POST` to `/auth/sign-out`. A `GET` would let a stray link or a prefetch sign a
  student out.

## Route protection

| Path | Requirement | Enforced by |
| --- | --- | --- |
| `/`, `/login`, `/auth/*` | none | — |
| `/onboarding` | signed in | `requireUser` |
| `/dashboard` and the rest of `(app)` | signed in **and** onboarded | `(app)/layout.tsx` → `requireOnboardedUser` |
| `/admin/*` | `admin` or `super_admin` | `admin/layout.tsx` → `requireAdmin` |

`proxy.ts` is a fast path, not the boundary. Every protected route re-checks on the server, and
every table is governed by RLS regardless.

`?next=` values pass through `safeNext()`, which accepts only same-origin absolute paths — this
closes off open-redirect attacks.

## Roles

Defined by the `app_role` enum: `student`, `admin`, `super_admin`, `reviewer`, `event_manager`,
`content_manager`. A user may hold several.

Authorization is always by role, never by email address. `src/lib/auth/roles.ts` maps admin areas
to the roles that may reach them, so adding a role is a change in one place.

**Only a `super_admin` can grant or revoke roles.** The RLS policy on `user_roles` restricts all
writes to super admins, which prevents an ordinary admin from escalating themselves. Grant the
first one by hand in SQL after they have signed in once.

## Consent

`src/lib/auth/consent.ts` holds the notice text and `CONSENT_VERSION`. Accepting stores
`consent_accepted_at` and `consent_version` on the profile. Bump the version when the wording
changes materially, and the app can then ask affected students to re-confirm.

## Not implemented yet

- Re-consent prompt when `CONSENT_VERSION` moves ahead of a stored value.
- Self-service account deletion. Students are told to ask an organiser; the cascade rules already
  support it.
- Additional rate limiting beyond Supabase's own email limits.
