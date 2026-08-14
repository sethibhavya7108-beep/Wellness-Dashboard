/**
 * Length of the emailed sign-in code.
 *
 * This must match the OTP length configured in the Supabase project
 * (Authentication → Sign In / Providers → Email → OTP length). They were out of
 * step once already: Supabase issued eight digits while the form accepted only
 * six, so every correct code was rejected as malformed and the failure looked
 * like the email had never arrived.
 *
 * Declared here and imported everywhere — the input, its pattern, the copy and
 * the server-side schema all read this one value.
 */
export const OTP_LENGTH = 8;

/** Words for the length, so the copy reads naturally rather than "8-digit". */
const WORDS: Record<number, string> = { 4: "four", 6: "six", 8: "eight", 10: "ten" };

export const OTP_LENGTH_WORD = WORDS[OTP_LENGTH] ?? String(OTP_LENGTH);

/** Placeholder of the right width, e.g. "00000000". */
export const OTP_PLACEHOLDER = "0".repeat(OTP_LENGTH);

/** Pattern for the input's `pattern` attribute and for server validation. */
export const OTP_PATTERN = `\\d{${OTP_LENGTH}}`;
