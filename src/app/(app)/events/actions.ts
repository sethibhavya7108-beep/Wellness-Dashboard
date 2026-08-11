"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RegistrationStatus } from "@/lib/supabase/database.types";

export type RegistrationResult = { error?: string; status?: RegistrationStatus };

/**
 * Register or cancel.
 *
 * Both go through SECURITY DEFINER functions that enforce capacity, deadlines
 * and publication state server-side. The database raises a message written for
 * a student, so it is passed through rather than replaced with a generic one.
 */
export async function register(eventId: string): Promise<RegistrationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data, error } = await supabase.rpc("register_for_event", { p_event_id: eventId });

  if (error) return { error: humanise(error.message) };

  await supabase.from("analytics_events").insert({
    user_id: user.id,
    name: "event_registered",
    properties: { event_id: eventId, status: data },
  });

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { status: data ?? undefined };
}

export async function cancel(eventId: string): Promise<RegistrationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase.rpc("cancel_event_registration", { p_event_id: eventId });
  if (error) return { error: humanise(error.message) };

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return {};
}

/** Database messages are already student-readable; anything else is not. */
function humanise(message: string): string {
  const known = [
    "not open for registration",
    "Registration for that event is closed",
    "deadline for that event has passed",
    "has already started",
  ];
  return known.some((k) => message.includes(k))
    ? message
    : "We could not update your registration. Please try again.";
}
