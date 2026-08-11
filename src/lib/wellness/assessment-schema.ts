import { z } from "zod";
import {
  SECTIONS,
  type AssessmentDraft,
  type Field,
  type FieldName,
} from "./assessment-fields";

/**
 * Server-side validation for the baseline check.
 *
 * Built from the same section definitions the form renders, so the accepted
 * range and the displayed range cannot drift apart. Every field is optional:
 * a student may skip a question, and the scoring engine excludes what they
 * skipped rather than scoring it zero.
 */

/** "" and undefined both mean "not answered". */
const blankToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

function schemaForField(field: Field): z.ZodTypeAny {
  switch (field.kind) {
    case "number":
    case "scale": {
      const min = field.min;
      const max = field.max;
      return z.preprocess(
        blankToNull,
        z
          .coerce
          .number({ message: "Enter a number" })
          .min(min, `Enter a value between ${min} and ${max}`)
          .max(max, `Enter a value between ${min} and ${max}`)
          .nullable(),
      );
    }
    case "select": {
      const values = field.options.map((o) => o.value) as [string, ...string[]];
      return z.preprocess(blankToNull, z.enum(values, { message: "Choose an option" }).nullable());
    }
    case "time":
      return z.preprocess(
        blankToNull,
        z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 23:30")
          .nullable(),
      );
  }
}

const shape = Object.fromEntries(
  SECTIONS.flatMap((s) => s.fields).map((f) => [f.name, schemaForField(f).optional()]),
) as unknown as Record<FieldName, z.ZodTypeAny>;

export const assessmentSchema = z.object(shape);

export type AssessmentParseResult =
  | { ok: true; values: Partial<AssessmentDraft> }
  | { ok: false; fieldErrors: Partial<Record<FieldName, string>> };

/**
 * Validate a submitted draft.
 *
 * Returns only the fields that were present in the input, so a partial autosave
 * never blanks an answer the student gave in another section.
 */
export function parseAssessment(input: Record<string, unknown>): AssessmentParseResult {
  const parsed = assessmentSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<FieldName, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as FieldName | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key in input) values[key] = value ?? null;
  }

  return { ok: true, values: values as Partial<AssessmentDraft> };
}
