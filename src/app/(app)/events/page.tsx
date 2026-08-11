import type { Metadata } from "next";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, nowIso } from "@/lib/utils";
import { RegisterButton } from "./register-button";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const ctx = await requireOnboardedUser("/events");
  const supabase = await createClient();

  const [{ data: events }, { data: mine }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .gte("starts_at", nowIso())
      .order("starts_at"),
    supabase
      .from("event_registrations")
      .select("event_id, status")
      .eq("user_id", ctx.userId),
  ]);

  const myStatus = new Map((mine ?? []).map((r) => [r.event_id, r.status]));

  // Counts come from a function: the RLS policy shows a student only their own
  // registration row, but how full an event is was never private.
  const counts = new Map<string, number>();
  await Promise.all(
    (events ?? []).map(async (e) => {
      const { data } = await supabase.rpc("event_registration_count", { p_event_id: e.id });
      counts.set(e.id, data ?? 0);
    }),
  );

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Events</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">What is coming up</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Wellness drives, screenings, talks and challenges run by the chapter. Attending earns
          points towards the leaderboard.
        </p>
      </header>

      {events && events.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {events.map((e) => {
            const taken = counts.get(e.id) ?? 0;
            const full = e.capacity !== null && taken >= e.capacity;
            const status = myStatus.get(e.id) ?? null;

            return (
              <li key={e.id}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {full ? <Badge tone="attention">Full</Badge> : null}
                      {status === "registered" ? <Badge tone="good">You are going</Badge> : null}
                      {status === "waitlisted" ? <Badge tone="neutral">Waitlisted</Badge> : null}
                    </div>

                    <h2 className="text-lg leading-snug">{e.title}</h2>

                    <dl className="space-y-1.5 text-sm text-muted">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 shrink-0" aria-hidden />
                        <span>
                          {formatDate(e.starts_at, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {e.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 shrink-0" aria-hidden />
                          <span>{e.location}</span>
                        </div>
                      ) : null}
                      {e.capacity !== null ? (
                        <div className="flex items-center gap-2">
                          <Users className="size-4 shrink-0" aria-hidden />
                          <span>
                            {taken} of {e.capacity} places taken
                          </span>
                        </div>
                      ) : null}
                    </dl>

                    {e.description ? (
                      <p className="flex-1 text-sm leading-relaxed text-muted">{e.description}</p>
                    ) : (
                      <div className="flex-1" />
                    )}

                    <RegisterButton eventId={e.id} initialStatus={status} full={full} />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled yet"
          description="Wellness drives, screenings and challenges will appear here once the chapter publishes them."
        />
      )}
    </Container>
  );
}
