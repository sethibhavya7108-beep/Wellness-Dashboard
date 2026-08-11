"use client";

import { useActionState, useState } from "react";
import { Building2, Home, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox, Field, Input, Label, Select, describedBy } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import { CONSENT_POINTS } from "@/lib/auth/consent";
import { completeProfile, type ProfileState } from "./actions";

const initial: ProfileState = {};

const PROGRAMS = [
  "BMS — Bachelor of Management Studies",
  "BBA (FIA) — Financial Investment Analysis",
  "B.Sc. (H) Computer Science",
  "Other",
] as const;

const LIVING = [
  {
    value: "hostel",
    label: "Hostel",
    icon: Building2,
    note: "College or university hostel",
  },
  { value: "pg", label: "PG / rented", icon: MapPin, note: "Paying guest or shared flat" },
  { value: "day_scholar", label: "Day scholar", icon: Home, note: "Living at home, commuting" },
] as const;

export function ProfileForm({ email, defaultName }: { email: string; defaultName: string }) {
  const [state, formAction, pending] = useActionState(completeProfile, initial);
  const [program, setProgram] = useState<string>("");
  const [living, setLiving] = useState<string>("");

  const thisYear = new Date().getFullYear();
  const batchYears = Array.from({ length: 6 }, (_, i) => thisYear - 1 + i);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      {/* ------------------------------------------------------------- About you */}
      <Card>
        <CardContent className="space-y-6 p-7">
          <div className="space-y-1">
            <h2 className="text-lg leading-snug">About you</h2>
            <p className="text-sm text-muted">
              Signed in as <span className="font-medium text-ink">{email}</span>
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Full name"
              htmlFor="full_name"
              error={state.fieldErrors?.full_name}
              required
              className="sm:col-span-2"
            >
              <Input
                id="full_name"
                name="full_name"
                autoComplete="name"
                required
                defaultValue={defaultName}
                placeholder="Bhavya Sethi"
                aria-invalid={Boolean(state.fieldErrors?.full_name)}
                aria-describedby={describedBy("full_name", { error: state.fieldErrors?.full_name })}
              />
            </Field>

            <Field
              label="Batch (graduating year)"
              htmlFor="batch_year"
              error={state.fieldErrors?.batch_year}
              required
            >
              <Select
                id="batch_year"
                name="batch_year"
                required
                defaultValue=""
                aria-invalid={Boolean(state.fieldErrors?.batch_year)}
                aria-describedby={describedBy("batch_year", {
                  error: state.fieldErrors?.batch_year,
                })}
              >
                <option value="" disabled>
                  Select year
                </option>
                {batchYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Course" htmlFor="program" error={state.fieldErrors?.program} required>
              <Select
                id="program"
                name="program"
                required
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                aria-invalid={Boolean(state.fieldErrors?.program)}
                aria-describedby={describedBy("program", { error: state.fieldErrors?.program })}
              >
                <option value="" disabled>
                  Select course
                </option>
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>

            {program === "Other" ? (
              <Field
                label="Which course?"
                htmlFor="program_other"
                error={state.fieldErrors?.program_other}
                className="sm:col-span-2"
              >
                <Input
                  id="program_other"
                  name="program_other"
                  required
                  placeholder="Enter your course"
                />
              </Field>
            ) : null}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink-soft">
              Where do you live during term?
              <span className="ml-0.5 text-accent" aria-hidden>
                *
              </span>
            </legend>
            <p className="text-xs text-muted">
              Used only to compare groups at campus level. It is a segmentation field, not a
              judgement about your health.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {LIVING.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1.5 rounded-md border p-4 transition-colors",
                    living === opt.value
                      ? "border-accent bg-accent-soft"
                      : "border-line-strong bg-surface hover:bg-raised",
                  )}
                >
                  <input
                    type="radio"
                    name="living_situation"
                    value={opt.value}
                    checked={living === opt.value}
                    onChange={(e) => setLiving(e.target.value)}
                    className="sr-only"
                    required
                  />
                  <opt.icon
                    className={cn(
                      "size-4",
                      living === opt.value ? "text-accent" : "text-muted",
                    )}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-ink">{opt.label}</span>
                  <span className="text-xs text-muted">{opt.note}</span>
                </label>
              ))}
            </div>

            {state.fieldErrors?.living_situation ? (
              <p className="text-xs font-medium text-status-priority">
                {state.fieldErrors.living_situation}
              </p>
            ) : null}
          </fieldset>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------------- Consent */}
      <Card>
        <CardContent className="space-y-6 p-7">
          <div className="space-y-1">
            <p className="eyebrow">Step 2 of 2</p>
            <h2 className="text-lg leading-snug">What we store, and why</h2>
          </div>

          <dl className="grid gap-5 sm:grid-cols-2">
            {CONSENT_POINTS.map((p) => (
              <div key={p.heading} className="space-y-1">
                <dt className="text-sm font-medium text-ink">{p.heading}</dt>
                <dd className="text-sm leading-relaxed text-muted">{p.body}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-md border border-line bg-paper p-4">
            <div className="flex gap-3">
              <Checkbox
                id="consent"
                name="consent"
                required
                aria-invalid={Boolean(state.fieldErrors?.consent)}
                aria-describedby={describedBy("consent", { error: state.fieldErrors?.consent })}
              />
              <Label htmlFor="consent" className="cursor-pointer text-sm leading-relaxed">
                I have read the above. I agree to Campus Wellness storing my answers to give me a
                personal roadmap and to report campus-level results.
              </Label>
            </div>
            {state.fieldErrors?.consent ? (
              <p id="consent-error" className="mt-2 text-xs font-medium text-status-priority">
                {state.fieldErrors.consent}
              </p>
            ) : null}
          </div>

          {/* Separate from consent on purpose: appearing in a public ranking is a
              different decision from agreeing to take part, and bundling the two
              would make neither a real choice. */}
          <div className="rounded-md border border-line bg-paper p-4">
            <div className="flex gap-3">
              <Checkbox id="leaderboard_opt_in" name="leaderboard_opt_in" />
              <Label
                htmlFor="leaderboard_opt_in"
                className="cursor-pointer text-sm leading-relaxed"
              >
                Show my name on the campus leaderboard.
                <span className="mt-1 block text-muted">
                  Optional. The leaderboard ranks habits logged and events attended — never BMI,
                  weight, stress or your wellness score. Leave this unticked and you still earn
                  points and see your own rank; other students just will not see you. You can
                  change this later.
                </span>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" loading={pending}>
          {pending ? "Saving…" : "Finish setup"}
        </Button>
        <p className="text-xs text-muted">
          You can ask a chapter organiser to delete your account and data at any time.
        </p>
      </div>
    </form>
  );
}
