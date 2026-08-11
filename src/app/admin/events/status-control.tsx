"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { EventStatus } from "@/lib/supabase/database.types";
import { setEventStatus } from "./actions";

const NEXT: Partial<Record<EventStatus, { to: EventStatus; label: string }[]>> = {
  draft: [{ to: "published", label: "Publish" }],
  published: [
    { to: "completed", label: "Mark complete" },
    { to: "cancelled", label: "Cancel" },
  ],
  cancelled: [{ to: "draft", label: "Back to draft" }],
  completed: [],
};

export function StatusControl({ eventId, status }: { eventId: string; status: EventStatus }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const options = NEXT[status] ?? [];

  if (options.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={o.to}
            size="sm"
            variant={o.to === "cancelled" ? "outline" : "primary"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await setEventStatus(eventId, o.to);
                if (result.error) setError(result.error);
              })
            }
          >
            {o.label}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs font-medium text-status-priority">{error}</p> : null}
    </div>
  );
}
