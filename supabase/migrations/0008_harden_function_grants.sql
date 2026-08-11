-- =============================================================================
-- 0008_harden_function_grants.sql — close the RPC surface on trigger functions
--
-- PostgREST exposes every function in the `public` schema that a role holds
-- EXECUTE on, including trigger functions, as /rest/v1/rpc/<name>. Postgres
-- refuses to run a trigger function called directly, so the practical risk is
-- low — but an endpoint that exists only to return an error is an endpoint that
-- should not exist. Every other function in this schema states its grants
-- explicitly; these three were relying on the default PUBLIC grant.
--
-- Found by the Supabase security advisor (lints 0028 and 0029).
-- =============================================================================

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.protect_profile_identity() from public, anon, authenticated;

-- The triggers themselves keep working: a trigger function runs as the table
-- owner during the statement, not as the caller, so no grant is needed for
-- signup provisioning, updated_at maintenance or identity protection.

-- -----------------------------------------------------------------------------
-- Deliberately left as they are
--
-- `citext` sits in the `public` schema (advisor lint 0014). Moving it would
-- mean rewriting the type of every citext column — profiles.email,
-- approved_email_domains.domain — and their dependent indexes and policies. The
-- risk of that migration outweighs a namespacing warning on a single-tenant
-- project.
--
-- Leaked-password protection is reported as disabled. This application has no
-- password flow at all: authentication is email OTP only, and no password is
-- ever set, stored or checked. Enabling it would change nothing.
--
-- `is_email_domain_approved` stays callable by `anon` on purpose. The sign-in
-- screen checks a typed domain before sending an OTP, and the function reveals
-- only whether a domain is on the allow-list — which the login page states in
-- plain text anyway.
-- -----------------------------------------------------------------------------
