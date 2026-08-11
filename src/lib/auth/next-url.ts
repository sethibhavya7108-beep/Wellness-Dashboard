/**
 * Post-login redirect targets must be same-origin absolute paths.
 * Anything else is discarded, which closes off open-redirect attacks via ?next=.
 */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
