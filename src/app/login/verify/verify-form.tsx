"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, describedBy } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { requestOtp, verifyOtp, type LoginState } from "../actions";

const initial: LoginState = {};

export function VerifyForm({ email, next }: { email: string; next: string }) {
  const [state, formAction, pending] = useActionState(verifyOtp, initial);
  const [resendState, resendAction, resending] = useActionState(requestOtp, initial);

  const hint = "Six digits, from the email we just sent.";

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5" noValidate>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />

        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {resendState.error ? <Alert tone="error">{resendState.error}</Alert> : null}

        <Field
          label="Verification code"
          htmlFor="token"
          hint={hint}
          error={state.fieldErrors?.token}
          required
        >
          <Input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            required
            placeholder="000000"
            className="h-14 text-center font-display text-2xl tracking-[0.5em] tabular-nums"
            aria-invalid={Boolean(state.fieldErrors?.token)}
            aria-describedby={describedBy("token", { hint, error: state.fieldErrors?.token })}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? "Verifying…" : "Verify and continue"}
        </Button>
      </form>

      <form action={resendAction} className="flex items-center gap-2 border-t border-line pt-6">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <p className="text-sm text-muted">Did not get it?</p>
        <Button type="submit" variant="link" size="sm" loading={resending} className="px-0">
          {resending ? "Sending…" : "Send another code"}
        </Button>
      </form>

      <p className="text-xs leading-relaxed text-muted">
        Check your spam folder before requesting another code. Repeated requests are rate-limited by
        the email provider.
      </p>
    </div>
  );
}
