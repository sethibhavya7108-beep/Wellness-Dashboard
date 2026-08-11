"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateRoadmap } from "@/lib/wellness/roadmap-service";

export type RoadmapActionState = { error?: string };

export async function startCycle(): Promise<RoadmapActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const result = await generateRoadmap(user.id);
  if (!result.ok) return { error: result.error };

  await supabase.from("analytics_events").insert({
    user_id: user.id,
    name: "roadmap_generated",
    properties: { roadmap_id: result.roadmapId },
  });

  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
  return {};
}
