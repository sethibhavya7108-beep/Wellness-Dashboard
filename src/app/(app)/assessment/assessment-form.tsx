"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, describedBy } from "@/components/ui/form";
import { Stepper } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  SECTIONS,
  SECTION_TITLES,
  type DraftValues,
  type Field as FieldDef,
  type FieldName,
} from "@/lib/wellness/assessment-fields";
import { completeAssessment, saveAssessmentDraft } from "./actions";

/**
 * The baseline check.
 *
 * Answers are saved to the open draft each time a section is left, so closing
 * the tab halfway through costs nothing. Every value is re-validated on the
 * server; the constraints here exist to catch a typo early, not to be trusted.
 */
export function AssessmentForm({
  kind,
  initialValues,
  startStep = 0,
}: {
  kind: string;
  initialValues: DraftValues;
  startStep?: number;
}) {
  const [values, setValues] = React.useState<DraftValues>(initialValues);
  const [step, setStep] = React.useState(Math.min(startStep, SECTIONS.length - 1));
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<FieldName, string>>>({});
  const [savedAt, setSavedAt] = React.useState<string | null>(null);

  const section = SECTIONS[step];
  const isLast = step === SECTIONS.length - 1;
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  function set(name: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  }

  /** Only this section's answers, so a save never touches another section. */
  function sectionValues(): Record<string, string> {
    return Object.fromEntries(section.fields.map((f) => [f.name, values[f.name]]));
  }

  function goTo(next: number) {
    setStep(next);
    setError(null);
    // Move focus to the new heading so the change is announced.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function handleNext() {
    setError(null);
    startTransition(async () => {
      const result = await saveAssessmentDraft(kind, sectionValues());
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSavedAt(result.savedAt);
      setFieldErrors({});
      goTo(step + 1);
    });
  }

  function handleBack() {
    if (step === 0) return;
    goTo(step - 1);
  }

  function handleFinish() {
    setError(null);
    startTransition(async () => {
      // Send everything: the server scores the whole assessment to decide
      // whether enough was answered to complete.
      const result = await completeAssessment(kind, values);
      if (result && !result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <div className="space-y-6">
      <Stepper steps={SECTION_TITLES} current={step} />

      <Card>
        <CardContent className="space-y-6 p-7">
          <div className="space-y-2">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-xl leading-snug outline-none sm:text-2xl"
            >
              {section.title}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted">{section.blurb}</p>
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            {section.fields.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                value={values[field.name]}
                error={fieldErrors[field.name]}
                onChange={(v) => set(field.name, v)}
              />
            ))}
          </div>

          <p className="text-xs text-muted">
            Every question is optional. Skipped sections are left out of your score rather than
            counted as zero.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={handleBack} disabled={step === 0 || pending}>
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>

        <div className="flex items-center gap-4">
          <span aria-live="polite" className="text-xs text-muted">
            {pending ? "Saving…" : savedAt ? "Saved" : ""}
          </span>

          {isLast ? (
            <Button onClick={handleFinish} loading={pending}>
              {pending ? null : <Check className="size-4" aria-hidden />}
              Finish
            </Button>
          ) : (
            <Button onClick={handleNext} loading={pending}>
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = `f-${field.name}`;
  const hint = "hint" in field ? field.hint : undefined;
  const described = describedBy(id, { hint, error });

  if (field.kind === "scale") {
    const options = Array.from(
      { length: field.max - field.min + 1 },
      (_, i) => field.min + i,
    );
    return (
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink-soft">{field.label}</legend>
        <div className="mt-3 flex gap-2">
          {options.map((n) => (
            <label
              key={n}
              className={cn(
                "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-md border px-2 py-3 text-sm transition-colors",
                value === String(n)
                  ? "border-accent bg-accent-soft font-medium text-ink"
                  : "border-line-strong text-muted hover:bg-raised",
              )}
            >
              <input
                type="radio"
                name={field.name}
                value={n}
                checked={value === String(n)}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              {n}
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>{field.minLabel}</span>
          <span>{field.maxLabel}</span>
        </div>
        {error ? (
          <p className="mt-2 text-xs font-medium text-status-priority">{error}</p>
        ) : null}
      </fieldset>
    );
  }

  if (field.kind === "select") {
    return (
      <Field label={field.label} htmlFor={id} hint={hint} error={error}>
        <Select
          id={id}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Prefer not to say</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.kind === "time") {
    return (
      <Field label={field.label} htmlFor={id} hint={hint} error={error}>
        <Input
          id={id}
          type="time"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  return (
    <Field label={field.label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          onChange={(e) => onChange(e.target.value)}
          className={field.suffix ? "pr-16" : undefined}
        />
        {field.suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
            {field.suffix}
          </span>
        ) : null}
      </div>
    </Field>
  );
}
