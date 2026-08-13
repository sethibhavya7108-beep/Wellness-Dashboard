import { signInWithGoogle } from "./google-actions";

/**
 * Sign in with Google.
 *
 * Rendered as a plain form posting to a server action rather than a client
 * component: there is no state to hold, and this way it works before any
 * JavaScript has loaded.
 */
export function GoogleButton({ next, disabled }: { next: string; disabled?: boolean }) {
  return (
    <form action={signInWithGoogle} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs tracking-wide text-muted uppercase">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50"
      >
        <GoogleMark />
        Continue with your college Google account
      </button>

      <p className="text-center text-xs leading-relaxed text-muted">
        Only approved college domains are accepted, whichever way you sign in.
      </p>
    </form>
  );
}

/** Google's mark, inline so the page makes no third-party request. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4 shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
