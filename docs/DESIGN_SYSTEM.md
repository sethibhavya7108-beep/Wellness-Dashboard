# Design system

## Direction

Premium Indian youth/community organisation aesthetic. Editorial rather than SaaS: strong
typography, generous whitespace, hairline borders instead of drop shadows, restrained colour, one
clear call to action per section.

Explicitly avoided: the stereotypical health-app look, heavy gradients, everything-rounded cards,
childish gamification, and generic AI-dashboard styling.

> The NationBuilding site was not reachable for inspection (it returns HTTP 403 to automated
> requests), so this language is derived from the written brief rather than from the live site. No
> assets, logos, illustrations or layouts have been copied. The chapter mark in
> `components/site/wordmark.tsx` is original. Adjust the tokens below if the real brand differs.

## Tokens

All tokens live in the `@theme` block of `src/app/globals.css`. **No component may hard-code a hex
value.** Tailwind generates utilities from these automatically (`bg-paper`, `text-ink`,
`border-line`, and so on).

### Colour — "Ink & Saffron"

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#0F1115` | Headings and body |
| `ink-soft` | `#2A2D34` | Labels, secondary headings |
| `muted` | `#6B6759` | Body secondary, captions |
| `faint` | `#98937F` | Placeholders, disabled |
| `paper` | `#FAF8F4` | Page background |
| `surface` | `#FFFFFF` | Cards |
| `raised` | `#F4F1EA` | Hover, inset panels |
| `line` / `line-strong` | `#E6E1D8` / `#D5CEC0` | Hairlines, input borders |
| `accent` / `accent-hover` | `#C8611A` / `#A94E14` | Primary action, key figures |
| `accent-soft` / `accent-line` | `#FBF0E6` / `#F0D9C3` | Accent surfaces |
| `forest` | `#1F4D3D` | Secondary, success |

### Status

`status-good` (forest), `status-fair` (amber), `status-attention` (burnt orange),
`status-priority` (red), each with a `-soft` background pair. These map one-to-one to the
`score_status` enum, so a category status never needs a colour lookup written by hand.

### Charts

`chart-1` … `chart-6`, an ordered categorical ramp starting with forest and saffron. Use in order;
do not pick arbitrary colours per series.

### Type

Display: **Fraunces** (variable serif) for h1–h4 and headline figures. Body and UI: **Inter**
(variable). Both self-hosted from `src/fonts`, loaded via `next/font/local`.

Headings carry `letter-spacing: -0.02em` and `text-wrap: balance`. Paragraphs use
`text-wrap: pretty`. Numbers use `tabular-nums` wherever they may change.

### Radii

`xs` 2px, `sm` 4px, `md` 6px, `lg` 10px, `xl` 14px. Deliberately tight — heavy rounding reads as
consumer-app, not editorial.

## Components

`src/components/ui/`

| File | Exports |
| --- | --- |
| `button.tsx` | `Button`, `buttonClasses` — variants `primary`, `secondary`, `outline`, `ghost`, `danger`, `link`; sizes `sm`, `md`, `lg`, `icon`; built-in `loading` |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `form.tsx` | `Input`, `Textarea`, `Select`, `Label`, `Checkbox`, `Field`, `describedBy` |
| `badge.tsx` | `Badge` — tones `neutral`, `accent`, `forest`, plus the four score statuses |
| `feedback.tsx` | `Alert` (info/success/warning/error), `Skeleton`, `EmptyState` |
| `progress.tsx` | `ProgressBar`, `ProgressRing`, `Stepper` |
| `layout.tsx` | `Container`, `Section`, `SectionHeading` |
| `toast.tsx` | `ToastProvider`, `useToast` |

`src/components/app/`: `AppShell`, `AppNav`, `AppNavMobile`, `StatCard`, `DistributionBar`,
`nav-config.ts`.

`src/components/site/`: `SiteHeader`, `SiteFooter`, `AuthShell`, `Wordmark`.

Primitives take the same props as their shadcn/ui equivalents, so a shadcn component can be dropped
in later without a refactor. `buttonClasses` exists so a `<Link>` can be styled as a button without
an `asChild` abstraction.

## Usage rules

- Use `Field` for every labelled control; pass `aria-describedby={describedBy(id, { hint, error })}`
  so hints and errors are announced.
- Cards get a hairline border and a flat surface. No drop shadows except the toast.
- One primary button per view. Everything else is `outline` or `ghost`.
- `StatCard` values must come from a real query. Never seed one with an illustrative number.
- Any illustrative UI (like the landing page preview) carries a visible "Illustrative" badge.
- Charts only where they beat a number or a table.

## States

Loading (`Skeleton`), empty (`EmptyState`), error (`Alert tone="error"`), disabled (`opacity-50`
plus `pointer-events-none` via the button base), and validation errors rendered by `Field`.

## Responsiveness

Mobile first. The signed-in shell uses a fixed bottom bar under `md` with up to four primary
destinations, and a horizontal nav above it; `main` carries `pb-24 md:pb-0` to clear it. Admin
tables become cards under `md`. Containers: `narrow` 2xl, `default` 6xl, `wide` 7xl.

## Accessibility

Focus ring is a 2px accent outline with 2px offset, defined once for `:focus-visible`. A skip link
sits at the top of every page. Icons are `aria-hidden` with text alternatives. Status colours are
paired with text labels, never used alone. `prefers-reduced-motion` disables animation globally.
