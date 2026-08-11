# Product requirements

## The problem

Students, particularly those in hostels and PGs, struggle to keep healthy daily habits: irregular
schedules, limited nutritional awareness, academic pressure, and no accountability. Health
information is abundant; personalised guidance and sustained motivation are not.

Existing consumer apps fail this cohort in three ways. They are generic, they demand more effort
than a term schedule allows, and they have no campus community attached — so adoption decays
within weeks.

## What this is

A campus preventive-health platform that turns:

```
assessment → insight → personalised roadmap → daily action → progress → community participation
```

It is a student product, not a hospital portal. It should feel modern, credible and low-friction,
and it must be serious enough for SSCBS administration and medical partners to stand behind.

## Users

| User | Needs |
| --- | --- |
| Student | Know where they stand, get a small plan they can keep, see progress, join events |
| Chapter organiser (admin) | Registration and engagement figures, event and content management |
| Medical reviewer | Approve or reject recommendations against cited sources |
| College administration | Campus-level impact evidence, no access to individual health data |

## Non-negotiable principles

1. **Behaviour, not status.** Points, badges and leaderboards reward habits completed, challenges
   finished and events attended. BMI, weight, stress level and wellness score never influence any
   ranking or reward.
2. **Two or three priorities at a time.** A student is never shown every category at once.
3. **Deterministic health logic.** Scoring and roadmap generation are auditable TypeScript, not a
   language model. AI may be added later as an optional layer, never as the authority.
4. **No unreviewed medical claims.** A recommendation reaches a student only after a named
   reviewer has checked it against a real cited source.
5. **No diagnosis.** BMI is shown as context with careful framing. The word "risk" is not used
   about an individual.
6. **Individual health data is private.** Only the student can read their own assessment, scores
   and check-ins — enforced in the database, not just the interface.
7. **Mobile first.** Students will use this on a phone between classes.

## Scope

**In scope:** registration with college email, baseline and endline assessment, wellness scoring,
roadmap generation, habit check-ins, streaks, points, badges, leaderboard, events with
registration, an awareness content feed, and an admin dashboard covering users, analytics, events,
challenges and content.

**Out of scope for now:** native mobile apps, wearable integrations, direct clinician messaging,
anything requiring infrastructure beyond GitHub, Vercel and Supabase.

## Success measures

Taken from the chapter's project proposal. These are **targets**, and the product must never
present them as achieved results.

| Measure | Year-one target |
| --- | --- |
| Registered students | 200+ |
| Weekly active participation in habit tracking | 60%+ |
| Improvement in self-reported habit score, baseline to endline | 20% |

Qualitative aims: raise awareness of preventive health, build accountability through peer
challenges, and shift students towards informed day-to-day decisions rather than reacting only
when something goes wrong.

## Constraints acknowledged in the proposal

- Sustaining engagement after the initial registration spike.
- Self-reported health data is imprecise; the product must be honest about that and must not
  present self-reported figures as clinical measurements.
- Events depend on college permissions and partner medical staff availability.
