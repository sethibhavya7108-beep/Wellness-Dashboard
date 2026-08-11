/**
 * Consent notice.
 *
 * The version string is stored on each profile so we can tell who agreed to
 * which text. Bump it whenever the wording below changes materially, and the
 * app can then ask affected students to re-confirm.
 */
export const CONSENT_VERSION = "2026-08-v1";

export const CONSENT_POINTS = [
  {
    heading: "What we collect",
    body: "Your name, college email, batch, course and living situation, plus the answers you give in the wellness check — sleep, food, water, activity, screen and sitting time, and a self-rated stress level. Height and weight are used only to show your BMI back to you.",
  },
  {
    heading: "Why we collect it",
    body: "To work out which two or three areas to focus on, to build your habit roadmap, and to measure whether the chapter's programme actually improves student health across the campus.",
  },
  {
    heading: "Who can see it",
    body: "Your individual answers are visible only to you. Chapter organisers and college staff see combined campus-level figures — for example the average sleep score by batch — never your personal responses.",
  },
  {
    heading: "What is never public",
    body: "Leaderboards and challenge results show names, batch and points earned from habits and events. They never show BMI, weight, stress level or any wellness score.",
  },
  {
    heading: "This is sensitive information",
    body: "Health-related answers deserve care. They are stored in an access-controlled database where the rules are enforced per-row, so another student cannot read your data even if they try.",
  },
  {
    heading: "Your choices",
    body: "You can skip any question you would rather not answer, and you can ask a chapter organiser to delete your account and data at any time.",
  },
] as const;
