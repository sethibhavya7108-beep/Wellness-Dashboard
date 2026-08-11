import { z } from "zod";

/**
 * Approved-domain policy.
 *
 * The allow-list itself lives in the `approved_email_domains` table, not here,
 * so new DU colleges can be added without a deploy. This module only holds the
 * shape rules and the helpers used at each enforcement layer.
 *
 * Enforcement happens three times (see /docs/AUTH.md):
 *   1. client   — instant feedback while typing
 *   2. server   — the sign-in action re-checks against the database
 *   3. database — a trigger on auth.users aborts signup for unapproved domains
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter your college email address")
  .max(254, "That email address is too long")
  .email("That does not look like a valid email address");

/** The domain part of an email address, lower-cased. Empty string if absent. */
export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

/** Human-readable list of accepted domains, e.g. "@sscbs.du.ac.in". */
export function formatDomains(domains: string[]): string {
  const tagged = domains.map((d) => `@${d}`);
  if (tagged.length <= 1) return tagged[0] ?? "";
  return `${tagged.slice(0, -1).join(", ")} or ${tagged[tagged.length - 1]}`;
}
