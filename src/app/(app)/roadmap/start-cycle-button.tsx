"use client";

import * as React from "react";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { startCycle } from "./actions";

export function StartCycleButton({ label = "Start my cycle" }: { label?: string }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startCycle();
            if (result.error) setError(result.error);
          })
        }
      >
        {pending ? null : <Route className="size-4" aria-hidden />}
        {label}
      </Button>
    </div>
  );
}
