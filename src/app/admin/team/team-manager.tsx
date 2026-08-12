"use client";

import * as React from "react";
import { UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, describedBy } from "@/components/ui/form";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { grantRole, revokeRole, type TeamState } from "./actions";

const GRANTABLE: AppRole[] = [
  "admin",
  "super_admin",
  "reviewer",
  "event_manager",
  "content_manager",
];

export type TeamMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
};

const initial: TeamState = {};

export function TeamManager({
  members,
  canManage,
}: {
  members: TeamMember[];
  canManage: boolean;
}) {
  const [state, action, pending] = React.useActionState(grantRole, initial);
  const [rowState, setRowState] = React.useState<TeamState>({});
  const [removing, startRemoving] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card>
          <CardContent className="p-7">
            <form ref={formRef} action={action} className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg leading-snug">Appoint someone</h2>
                <p className="text-sm text-muted">
                  They must have signed in at least once, so there is an account to attach the role
                  to.
                </p>
              </div>

              {state.error ? <Alert tone="error">{state.error}</Alert> : null}
              {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}

              <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr_auto] sm:items-end">
                <Field label="College email" htmlFor="email">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@sscbs.du.ac.in"
                    aria-describedby={describedBy("email", {})}
                  />
                </Field>

                <Field label="Role" htmlFor="role">
                  <Select id="role" name="role" defaultValue="admin" required>
                    {GRANTABLE.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Button type="submit" loading={pending}>
                  {pending ? null : <UserPlus className="size-4" aria-hidden />}
                  Grant
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Alert tone="info">
          You can see who holds which role. Only a super admin can change them.
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="text-lg leading-snug">Who has access</h2>

        {rowState.error ? <Alert tone="error">{rowState.error}</Alert> : null}
        {rowState.ok ? <Alert tone="success">{rowState.ok}</Alert> : null}

        {members.length === 0 ? (
          <EmptyState
            title="No roles granted yet"
            description="Everyone signed in so far is an ordinary student."
          />
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.user_id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-ink">{m.full_name ?? "Unnamed"}</p>
                      <p className="text-sm text-muted">{m.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {m.roles.map((role) => (
                        <span key={role} className="inline-flex items-center gap-1">
                          <Badge tone={role === "super_admin" ? "accent" : "neutral"}>
                            {ROLE_LABELS[role]}
                          </Badge>
                          {canManage ? (
                            <button
                              type="button"
                              disabled={removing}
                              title={`Remove ${ROLE_LABELS[role]}`}
                              onClick={() =>
                                startRemoving(async () => {
                                  setRowState({});
                                  setRowState(await revokeRole(m.email, role));
                                })
                              }
                              className="rounded-sm p-0.5 text-faint transition-colors hover:text-status-priority disabled:opacity-50"
                            >
                              <X className="size-3.5" aria-hidden />
                              <span className="sr-only">
                                Remove {ROLE_LABELS[role]} from {m.email}
                              </span>
                            </button>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
