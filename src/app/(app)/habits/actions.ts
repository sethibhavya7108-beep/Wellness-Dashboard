"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CheckinStatus } from "@/lib/supabase/database.types";

export type CheckinResult = {
  error?: string;
  /** Badges earned by this check-in, so the interface can celebrate once. */
  newBadges?: { code: string; name: string }[];
};

const STATUSES: CheckinStatus[] = ["yes", "partial", "no"];

/**
 * Log one habit for one day.
 *
 * The write goes through `log_habit_checkin`, which verifies ownership, keeps
 * the check-in and its points in one transaction, and is idempotent per habit
 * per day. Students hold no INSERT grant on points_transactions, so this is the
 * only path by which points can exist.
 */
export async function logCheckin(
  roadmapHabitId: string,
  status: string,
  mood?: number | null,
): Promise<CheckinResult> {
  if (!STATUSES.includes(status as CheckinStatus)) {
    return { error: "That is not a valid answer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase.rpc("log_habit_checkin", {
    p_roadmap_habit_id: roadmapHabitId,
    p_status: status as CheckinStatus,
    p_mood: mood ?? null,
  });

  if (error) {
    return { error: "We could not save that just now. Please try again." };
  }

  const { data: badges } = await supabase.rpc("evaluate_badges");

  revalidatePath("/habits");
  revalidatePath("/progress");
  revalidatePath("/dashboard");

  return { newBadges: badges ?? [] };
}
