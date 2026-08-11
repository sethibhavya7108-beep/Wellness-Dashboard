# Medical evidence

## The rule

**Nothing medical reaches a student until a named human reviewer has checked it against a real,
cited document.** This is enforced in three places, not just by convention.

1. A check constraint: a recommendation cannot be marked `approved` without both a `source_id` and
   a `reviewed_at`.
2. An RLS policy: students can only read recommendations where `review_status = 'approved'`.
3. Seed data: every recommendation ships as `pending_review`. On a fresh install, students see no
   medical claims at all — which is the correct default.

## Sources

Seeded in `0004_seed.sql`. Each URL was checked to resolve to the cited document.

| Organization | Title | Year |
| --- | --- | --- |
| World Health Organization | [Guidelines on physical activity and sedentary behaviour](https://www.who.int/publications/i/item/9789240015128) | 2020 |
| ICMR — National Institute of Nutrition | [Dietary Guidelines for Indians](https://main.icmr.nic.in/sites/default/files/upload_documents/DGI_07th_May_2024_fin.pdf) | 2024 |
| FSSAI | [Eat Right Campus](https://eatrightindia.gov.in/EatRightCampus/about) | initiative |
| AASM & Sleep Research Society | [Recommended amount of sleep for a healthy adult](https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/) | 2015 |

Further sources named in the chapter's proposal and not yet added: Ayushman Bharat / ABHA policy
documents, and PubMed literature on lifestyle-related conditions in Indian students aged 18–25.
Add them only with a URL you have opened yourself.

## Adding a source

```sql
insert into public.sources (organization, title, url, published_year, notes)
values ('...', '...', 'https://...', 2024, 'What this document actually says');
```

Do not add a row you have not read. Do not paraphrase a claim beyond what the document states. Do
not cite a secondary article as if it were the guideline.

## Review workflow

```
draft → pending_review → approved      (visible to students)
                      ↘ rejected       (never shown)
```

The reviewer should hold the `reviewer` role. Approving requires setting `source_id`,
`reviewed_by` and `reviewed_at`; the database rejects the update otherwise.

The reviewer's job for each recommendation: does the cited document actually say this, is the
wording free of diagnosis, and is it appropriate for a general student population rather than a
patient?

## What the app will not do

- Diagnose, or imply a diagnosis. No "you are at risk of…" about an individual.
- Present self-reported answers as clinical measurements.
- Let a language model generate, phrase or approve a health recommendation. AI may be added later
  for summarising or nudging copy; it will never be the authority on a health claim.
- Show BMI with an interpretation until the bands in `rules.ts` have been reviewed. General WHO
  adult cut-offs are what is in the file; cut-offs for South Asian populations are debated and
  differ.
- Invent a source, a year, or a URL.

## Display

Approved recommendations carry a source tag — organisation and a link to the document. The landing
page lists the evidence base openly, because credibility with SSCBS administration and medical
partners depends on it being visible rather than claimed.

Habit templates are different: they are behaviour targets authored by the chapter, not health
claims, and their `approval_status` means "approved for use by the product". Where a habit has an
obvious evidence base it is linked to a source anyway, for context.

## Standing disclaimer

Campus Wellness supports everyday habits. It does not diagnose, treat or give medical advice. It
appears in the footer of the marketing site and the auth flow, and must stay on any screen that
shows a health figure.
