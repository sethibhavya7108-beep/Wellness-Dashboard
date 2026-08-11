"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { RegistrationStatus } from "@/lib/supabase/database.types";
import { cancel, register } from "./actions";

export function RegisterButton({
  eventId,
  initialStatus,
  full,
}: {
  eventId: string;
  initialStatus: RegistrationStatus | null;
  full: boolean;
}) {
  const [status, setStatus] = React.useState<RegistrationStatus | null>(initialStatus);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const registered = status === "registered" || status === "waitlisted";

  function act() {
    setError(null);
    startTransition(async () => {
      const result = registered ? await cancel(eventId) : await register(eventId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus(registered ? "cancelled" : (result.status ?? "registered"));
    });
  }

  return (
    <div className="space-y-2">
      <Button
        variant={registered ? "outline" : "primary"}
        size="sm"
        loading={pending}
        onClick={act}
      >
        {registered
          ? status === "waitlisted"
            ? "Leave the waitlist"
            : "Cancel my place"
          : full
            ? "Join the waitlist"
            : "Register"}
      </Button>

      {status === "waitlisted" ? (
        <p className="text-xs text-muted" role="status">
          You are on the waitlist. If someone cancels, the longest wait goes first.
        </p>
      ) : null}

      {error ? <p className="text-xs font-medium text-status-priority">{error}</p> : null}
    </div>
  );
}
