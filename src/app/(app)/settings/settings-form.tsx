"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Label, Select, describedBy } from "@/components/ui/form";
import type { ProfileRow } from "@/lib/supabase/database.types";
import { updateProfile, type SettingsState } from "./actions";

const PROGRAMS = [
  "BMS — Bachelor of Management Studies",
  "BBA (FIA) — Financial Investment Analysis",
  "B.Sc. (H) Computer Science",
  "Other",
];

const LIVING = [
  { value: "hostel", label: "Hostel" },
  { value: "pg", label: "PG / rented" },
  { value: "day_scholar", label: "Day scholar" },
];

const initial: SettingsState = {};

export function SettingsForm({ profile }: { profile: ProfileRow }) {
  const [state, action, pending] = React.useActionState(updateProfile, initial);
  const err = (name: string) => state.fieldErrors?.[name];

  // A course typed as "Other" at onboarding is not in the list, so it is added
  // rather than silently reset to the first option on the next save.
  const programOptions = PROGRAMS.includes(profile.program ?? "")
    ? PROGRAMS
    : [...PROGRAMS, profile.program].filter((p): p is string => Boolean(p));

  return (
    <Card>
      <CardContent className="p-7">
        <form action={action} className="space-y-5">
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}
          {state.ok ? <Alert tone="success">Saved.</Alert> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="full_name" error={err("full_name")} required>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile.full_name ?? ""}
                required
                aria-describedby={describedBy("full_name", { error: err("full_name") })}
              />
            </Field>

            <Field
              label="Graduating year"
              htmlFor="batch_year"
              error={err("batch_year")}
              required
            >
              <Input
                id="batch_year"
                name="batch_year"
                type="number"
                defaultValue={profile.batch_year ?? ""}
                required
              />
            </Field>

            <Field label="Course" htmlFor="program" error={err("program")} required>
              <Select id="program" name="program" defaultValue={profile.program ?? ""} required>
                {programOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Living situation"
              htmlFor="living_situation"
              error={err("living_situation")}
              required
            >
              <Select
                id="living_situation"
                name="living_situation"
                defaultValue={profile.living_situation ?? ""}
                required
              >
                {LIVING.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="rounded-md border border-line bg-paper p-4">
            <div className="flex gap-3">
              <Checkbox
                id="leaderboard_opt_in"
                name="leaderboard_opt_in"
                defaultChecked={profile.leaderboard_opt_in}
              />
              <Label htmlFor="leaderboard_opt_in" className="cursor-pointer text-sm leading-relaxed">
                Show my name on the campus leaderboard.
                <span className="mt-1 block text-muted">
                  Ranks habits logged and events attended — never BMI, weight, stress or your
                  wellness score. Untick it and you still earn points and see your own rank; other
                  students just will not see you.
                </span>
              </Label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
            <p className="text-xs text-muted">
              Your college email cannot be changed — it is how your account is identified.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
