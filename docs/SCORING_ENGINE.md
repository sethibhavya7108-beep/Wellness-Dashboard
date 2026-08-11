# Scoring engine

**Files:** `src/lib/wellness/rules.ts` (every threshold) and `src/lib/wellness/scoring.ts` (pure
functions). Tests: `npm run test:scoring`.

## Rules

1. Every health threshold in the product lives in `rules.ts`. No component, route or SQL query may
   hard-code one.
2. `scoring.ts` contains pure functions only — no clock, no network, no randomness, no model. The
   same answers always produce the same result, which is what makes a score auditable months later.
3. `RULES_VERSION` is stored on every score row. Changing a band means bumping it.
4. **BMI is excluded from the score.** It describes status, not behaviour.

## Categories

Each has a raw value, a set of half-open bands (`min <= value < max`), a normalized 0–100 score, a
status, and a weight.

| Category | Raw value | Weight |
| --- | --- | --- |
| Sleep | hours per night | 1.2 |
| Diet | 0–100 composite (see below) | 1.2 |
| Movement | active minutes per week (`days × minutes`) | 1.2 |
| Stress | self-rated 1–5 | 1.2 |
| Hydration | litres per day | 1.0 |
| Sitting | hours per day | 1.0 |
| Screen time | non-academic hours per day | 0.8 |

Statuses, worst to best: `priority`, `attention`, `fair`, `good`.

Sleep is the only non-monotonic category — both too little and unusually long score below the
7–9.5 hour band. Everything else moves in one direction, and the test suite asserts it.

Illustrative thresholds, all in `rules.ts`: sleep under 6 hours is a priority; hydration under 1.5
litres is flagged; sitting over 8 hours is flagged. These are **initial product logic**, chosen to
be conservative. They are not medical criteria and have not been through medical review.

### Diet composite

Three equally weighted linear components: meals per day (3 is the reference, each meal away costs
25 points), outside meals per week (0 → 100, 14+ → 0) and junk meals per week (0 → 100, 10+ → 0).
Unanswered components default to 60 rather than 0.

Deliberately crude and readable. It exists to rank habits, not to assess nutrition.

## Overall score

Weighted mean of the categories the student actually answered, rounded to an integer.

Skipped questions are **excluded**, not scored as zero — a student who declines a question is not
punished for it. The categories they skipped are returned in `missing` so the interface can invite
them back.

## Priority selection

Ranked by: worse status first, then lower score, then higher weight, then a fixed category order.
The final tiebreak means the result never depends on object iteration order.

- Categories with status `attention` or `priority` are eligible.
- If at least 2 are eligible, take up to 3.
- If fewer than 2 are eligible, the next-weakest categories are pulled in, so a roadmap always has
  something to work on.
- Never more than `MAX_PRIORITIES` (3).

## BMI

Computed from height and weight, displayed as context with neutral wording ("Within the typical
adult range"), and carrying `reviewStatus: "pending_medical_review"`.

It does not enter the wellness score, priority selection, points, badges or the leaderboard. The
test suite asserts that two assessments differing only in height and weight produce an identical
overall score and identical priorities.

The bands are the general WHO adult cut-offs. Cut-offs for South Asian populations are debated and
differ. **This table must be reviewed by a qualified reviewer before the app shows any
interpretation to students.**

## Tests

`npm run test:scoring` — 15 assertions covering band contiguity and coverage, score range,
directional monotonicity, the sleep peak, derivation helpers, BMI isolation, priority count and
ordering, exclusion of skipped questions, and determinism.

Run these after any change to `rules.ts`. A band edit that opens a gap will fail the suite.

## Changing a threshold after medical review

1. Edit the band in `rules.ts`.
2. Bump `RULES_VERSION`.
3. Run `npm run test:scoring`.
4. Note the change and the reviewer in `CHANGELOG.md`.

Historical scores keep the version that produced them and are not recomputed.
