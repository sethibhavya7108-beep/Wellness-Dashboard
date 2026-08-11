import { z } from "zod";

/**
 * Environment handling.
 *
 * Rules:
 * - Only NEXT_PUBLIC_* values may reach the browser.
 * - Validation is lazy so a production build never fails merely because a
 *   deploy-time secret is absent; it fails loudly at request time instead.
 * - The service-role key is deliberately NOT read anywhere in this codebase.
 *   All privileged access goes through Postgres RLS and SECURITY DEFINER
 *   functions. See /docs/SECURITY.md.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY looks invalid"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cached: PublicEnv | null = null;

export function publicEnv(): PublicEnv {
  if (cached) return cached;

  // These must be referenced statically for Next.js to inline them.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Supabase environment is not configured (${missing}). ` +
        `Copy .env.example to .env.local and fill in your project values.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Canonical origin for auth redirect links.
 *
 * Never hard-code a Vercel domain: prefer the explicitly configured site URL,
 * then Vercel's own project URL, then localhost for development.
 *
 * Prefer `requestOrigin()` in a server action or route handler — it works
 * without any environment variable being set, which is the failure this
 * function kept producing on a fresh deploy.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

/**
 * The origin the current request actually arrived on.
 *
 * A deploy where `NEXT_PUBLIC_SITE_URL` was never set used to fall all the way
 * through to localhost, so the sign-in email sent production users to their own
 * machine. Reading the request's own host removes that whole class of mistake:
 * the link points wherever the student already is.
 *
 * The Host header is caller-controlled, so this is not a trust boundary. It is
 * safe here only because Supabase refuses any `emailRedirectTo` that is not on
 * the project's redirect allow-list — that list is the actual control.
 * An explicitly configured site URL still wins, so a canonical domain can be
 * pinned when one exists.
 */
export async function requestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");

  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return siteUrl();
}
