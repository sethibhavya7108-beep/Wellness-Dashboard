# Roadmap engine

**Status: designed, not yet implemented.** This document is the specification the Phase 5
implementation must follow. The database tables (`roadmaps`, `roadmap_habits`, `habit_templates`)
and the priority selection it depends on already exist.

## Shape of a cycle

- 2–4 weeks, default 28 days.
- Targets the 2–3 priority categories returned by the scoring engine — never more.
- One active roadmap per student, enforced by a partial unique index.
- Ends with a prompt to retake the assessment, producing the endline comparison.

## Generation

1. Score the completed assessment.
2. Take `result.priorities` (already ranked, already capped at 3).
3. For each priority, pick one habit from `habit_templates` where `category` matches,
   `is_active` is true and `approval_status = 'approved'`.
4. Choose the starting difficulty from the category status:

   | Status | Starting difficulty |
   | --- | --- |
   | `priority` | `basic` |
   | `attention` | `basic` |
   | `fair` | `intermediate` |
   | `good` | `intermediate` |

   Someone furthest from the target starts with the smallest possible step. That is the whole point.
5. Prefer a habit the student has not been given before; fall back to the lowest-position match so
   generation stays deterministic.
6. Insert the `roadmap` and its `roadmap_habits`, copying difficulty, target and points so a later
   edit to the template does not rewrite history.

Generation must be deterministic: the same assessment and the same habit library produce the same
roadmap.

## Adaptation

Evaluated at the end of each week of the cycle, from `habit_checkins`.

| Weekly completion | Action |
| --- | --- |
| ≥ 80% | Step difficulty up one level, or if already `advanced`, mark the habit complete and move attention to the next priority category |
| 40–79% | Leave unchanged |
| < 40% twice in a row | Step difficulty down one level, or if already `basic`, swap for a different habit in the same category |

`partial` check-ins count as half. Difficulty changes create a new `roadmap_habits` row with the
previous one marked `swapped`, so the history of what was actually asked stays intact.

## Cycle completion

At `cycle_end`: set `status = 'completed'`, prompt for the endline assessment, award the
`cycle_complete` badge, and generate the next roadmap from the new scores.

If a student abandons a cycle (no check-ins for 14 days), mark it `abandoned` and offer a fresh
start rather than resuming a stale plan.

## Habit library

Seeded in `0004_seed.sql`: three difficulties across all seven categories.

`approval_status` on a habit template means **approved for use by the product** — the chapter has
authored and accepted it. This is a different gate from the medical review applied to
`recommendations`. A habit is a behaviour target ("drink 6 glasses of water today"); a
recommendation is a health claim ("adults should sleep seven or more hours"). Only the latter needs
a reviewer and a citation.

## Constraints

- Never assign more than 3 active habits at once.
- Never assign two habits from the same category in one cycle.
- Never generate from an incomplete assessment.
- Never make an LLM the source of a habit. New habits are authored by the chapter and inserted into
  `habit_templates`.
