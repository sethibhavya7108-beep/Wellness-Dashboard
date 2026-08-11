"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireArea } from "@/lib/auth/admin-area";
import type { EventStatus } from "@/lib/supabase/database.types";

export type EventFormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const eventSchema = z.object({
  title: z.string().trim().min(3, "Give the event a title").max(160),
  slug: z
    .string()
    .trim()
    .min(3, "Give the event a slug")
    .max(80)
    .regex(slugPattern, "Lowercase letters, numbers and hyphens only"),
  description: z.string().trim().max(2000).optional(),
  starts_at: z.string().min(1, "When does it start?"),
  ends_at: z.string().optional(),
  location: z.string().trim().max(160).optional(),
  capacity: z.string().optional(),
  registration_deadline: z.string().optional(),
  organizer: z.string().trim().max(160).optional(),
});

/** Empty strings from a form mean "not set", not "clear to empty string". */
function optional(value: FormDataEntryValue | null): string | undefined {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? undefined : s;
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const ctx = await requireArea("events");

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: optional(formData.get("description")),
    starts_at: formData.get("starts_at"),
    ends_at: optional(formData.get("ends_at")),
    location: optional(formData.get("location")),
    capacity: optional(formData.get("capacity")),
    registration_deadline: optional(formData.get("registration_deadline")),
    organizer: optional(formData.get("organizer")),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const v = parsed.data;
  const capacity = v.capacity ? Number(v.capacity) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
    return { fieldErrors: { capacity: "Capacity must be a whole number above zero" } };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    title: v.title,
    slug: v.slug,
    description: v.description ?? null,
    starts_at: new Date(v.starts_at).toISOString(),
    ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
    location: v.location ?? null,
    capacity,
    registration_deadline: v.registration_deadline
      ? new Date(v.registration_deadline).toISOString()
      : null,
    organizer: v.organizer ?? null,
    // Created as a draft on purpose: publishing is a separate, deliberate act.
    status: "draft",
    created_by: ctx.userId,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "That slug is already taken." : "We could not save the event.",
    };
  }

  revalidatePath("/admin/events");
  return { ok: true };
}

const STATUSES: EventStatus[] = ["draft", "published", "cancelled", "completed"];

export async function setEventStatus(eventId: string, status: string): Promise<EventFormState> {
  await requireArea("events");
  if (!STATUSES.includes(status as EventStatus)) return { error: "Unknown status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status: status as EventStatus })
    .eq("id", eventId);

  if (error) return { error: "We could not update the event." };

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true };
}

export async function setAttendance(
  eventId: string,
  userId: string,
  attended: boolean,
): Promise<EventFormState> {
  await requireArea("events");

  const supabase = await createClient();
  // Attendance and its points award are one transaction inside the database;
  // the role check happens there too rather than being trusted from here.
  const { error } = await supabase.rpc("mark_event_attendance", {
    p_event_id: eventId,
    p_user_id: userId,
    p_attended: attended,
  });

  if (error) return { error: "We could not record attendance." };

  revalidatePath("/admin/events");
  return { ok: true };
}
