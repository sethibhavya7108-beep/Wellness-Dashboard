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
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
