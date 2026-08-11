import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isoDate } from "@/lib/utils";
import {
  CYCLE_DAYS,
  ROADMAP_ENGINE_VERSION,
  cycleEnd,
  selectHabits,
  type PriorityInput,
} from "./roadmap";
import { getLatestScore } from "./latest-score";
import type { RoadmapHabitRow, RoadmapRow } from "@/lib/supabase/database.types";

export type HabitTemplateSummary = {
  title: string;
  description: string;
  target_unit: string | null;
  frequency: string;
};

export type RoadmapHabitWithTemplate = RoadmapHabitRow & {
  habit_templates: HabitTemplateSummary | null;
};

export type ActiveRoadmap = {
  roadmap: RoadmapRow;
  habits: RoadmapHabitWithTemplate[];
};

/** The student's current cycle, or null when they have none. */
export async function getActiveRoadmap(userId: string): Promise<ActiveRoadmap | null> {
  const supabase = await createClient();

  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!roadmap) return null;

  const { data: habits } = await supabase
    .from("roadmap_habits")
    .select("*")
    .eq("roadmap_id", roadmap.id)
    .eq("status", "active")
    .order("position");

  const rows = habits ?? [];
  if (rows.length === 0) return { roadmap, habits: [] };

  // Joined in TypeScript rather than embedded in the select: database.types.ts
  // is hand-maintained and carries no relationship metadata for PostgREST to
  // type an embed against.
  const { data: templates } = await supabase
    .from("habit_templates")
    .select("id, title, description, target_unit, frequency")
    .in(
      "id",
      rows.map((r) => r.habit_template_id),
    );

  const byId = new Map((templates ?? []).map((t) => [t.id, t]));

  return {
    roadmap,
    habits: rows.map((r) => ({
      ...r,
      habit_templates: byId.get(r.habit_template_id) ?? null,
    })),
  };
}

export type GenerateResult =
  | { ok: true; roadmapId: string }
  | { ok: false; error: string };

/**
 * Build a cycle from the student's latest score.
 *
 * Refuses when a cycle is already running: the partial unique index enforces
 * one active roadmap per student, and racing it would surface as a database
 * error rather than a sentence a student can act on.
 */
export async function generateRoadmap(userId: string): Promise<GenerateResult> {
  const supabase = await createClient();

  const existing = await getActiveRoadmap(userId);
  if (existing) return { ok: true, roadmapId: existing.roadmap.id };

  const score = await getLatestScore(userId);
  if (!score) {
    return { ok: false, error: "Complete the baseline check first — there is nothing to plan from." };
  }

  const priorities: PriorityInput[] = score.priorities.map((p) => ({
    category: p.category,
    status: p.status,
  }));

  const [{ data: library }, { data: previous }] = await Promise.all([
    supabase
      .from("habit_templates")
      .select("*")
      .eq("is_active", true)
      .eq("approval_status", "approved"),
    supabase
      .from("roadmap_habits")
      .select("habit_template_id, roadmaps!inner(user_id)")
      .eq("roadmaps.user_id", userId),
  ]);

  const usedIds = new Set((previous ?? []).map((r) => r.habit_template_id));
  const chosen = selectHabits(priorities, library ?? [], usedIds);

  if (chosen.length === 0) {
    return {
      ok: false,
      error: "No approved habits match your priority areas yet. An organiser has been notified.",
    };
  }

  const start = isoDate();
  const { data: roadmap, error: roadmapError } = await supabase
    .from("roadmaps")
    .insert({
      user_id: userId,
      assessment_id: score.assessmentId,
      cycle_start: start,
      cycle_end: cycleEnd(start, CYCLE_DAYS),
      status: "active",
      engine_version: ROADMAP_ENGINE_VERSION,
    })
    .select("id")
    .single();

  if (roadmapError || !roadmap) {
    return { ok: false, error: "We could not start your cycle. Please try again." };
  }

  // Difficulty, target and points are copied onto the roadmap habit so a later
  // edit to the template does not rewrite what a student was actually asked to do.
  const { error: habitsError } = await supabase.from("roadmap_habits").insert(
    chosen.map((c) => ({
      roadmap_id: roadmap.id,
      habit_template_id: c.template.id,
      category: c.category,
      difficulty: c.difficulty,
      target_value: c.template.target_value,
      points: c.template.points,
      position: c.position,
      status: "active" as const,
    })),
  );

  if (habitsError) {
    // Without habits the roadmap is an empty shell that would block the next
    // attempt, so retire it rather than leaving it active.
    await supabase.from("roadmaps").update({ status: "abandoned" }).eq("id", roadmap.id);
    return { ok: false, error: "We could not start your cycle. Please try again." };
  }

  return { ok: true, roadmapId: roadmap.id };
}
