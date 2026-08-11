"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, describedBy } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { emailDomain, formatDomains } from "@/lib/auth/domains";
import { requestOtp, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm({
  domains,
  next,
  disabled,
}: {
  domains: string[];
  next: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(requestOtp, initial);
  const [email, setEmail] = useState("");

  // Enforcement layer 1 of 3: an instant hint while typing. The server action
  // and a database trigger both re-check, so this is convenience, not security.
  const typedDomain = emailDomain(email);
  const domainMismatch =
    domains.length > 0 && typedDomain.length > 0 && !domains.includes(typedDomain);

  const hint =
    domains.length > 0
      ? `Use your college address ending in ${formatDomains(domains)}.`
      : "Use your college email address.";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field
        label="College email"
        htmlFor="email"
        hint={hint}
        error={state.fieldErrors?.email}
        required
      >
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="yourname@sscbs.du.ac.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.email) || domainMismatch}
          aria-describedby={describedBy("email", { hint, error: state.fieldErrors?.email })}
          disabled={disabled}
        />
      </Field>

      {domainMismatch && !state.fieldErrors?.email ? (
        <p className="text-xs text-status-fair">
          @{typedDomain} is not on the approved list yet. Only {formatDomains(domains)} can register
          right now.
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={disabled}>
        {pending ? "Sending code…" : "Email me a code"}
      </Button>

      <p className="text-xs leading-relaxed text-muted">
        By continuing you agree to receive a sign-in code at this address. You will be shown exactly
        what data the platform stores, and asked to consent, before any health questions.
      </p>
    </form>
  );
}
