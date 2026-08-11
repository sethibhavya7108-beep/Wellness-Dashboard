import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  await requireOnboardedUser("/leaderboard");
  const supabase = await createClient();

  // A SECURITY DEFINER function with an explicit projection rather than a view:
  // name, batch and points only, so no health metric can leak through this
  // surface even by accident.
  const { data: rows } = await supabase.rpc("get_leaderboard", { result_limit: 50 });

  return (
    <Container width="narrow" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Leaderboard</p>
        <h1 className="text-3xl leading-tight">Ranked on what people did</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Points come from habits logged, checks completed and events attended. BMI, weight, stress
          and wellness scores appear nowhere in this ranking — health status is never a competition.
        </p>
      </header>

      {rows && rows.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ol>
              {rows.map((row) => (
                <li
                  key={row.user_id}
                  className={cn(
                    "flex items-center gap-4 border-b border-line px-6 py-3.5 last:border-b-0",
                    row.is_self && "bg-accent-soft",
                  )}
                >
                  <span className="w-8 shrink-0 text-sm tabular-nums text-muted">{row.rank}</span>
                  <span className="flex-1 truncate text-sm text-ink">
                    {row.full_name}
                    {row.is_self ? <span className="ml-2 text-xs text-accent">you</span> : null}
                  </span>
                  {row.batch_year ? (
                    <span className="shrink-0 text-xs text-muted">{row.batch_year}</span>
                  ) : null}
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums font-medium text-ink">
                    {row.total_points}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Trophy}
          title="Nobody on the board yet"
          description="Points start accumulating as students complete their baseline check and log habits."
        />
      )}
    </Container>
  );
}
