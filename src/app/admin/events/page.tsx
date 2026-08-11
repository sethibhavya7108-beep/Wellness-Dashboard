import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { requireArea } from "@/lib/auth/admin-area";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { EventStatus } from "@/lib/supabase/database.types";
import { EventForm } from "./event-form";
import { StatusControl } from "./status-control";

export const metadata: Metadata = { title: "Events" };

const STATUS_TONE: Record<EventStatus, "good" | "neutral" | "attention" | "priority"> = {
  published: "good",
  draft: "neutral",
  completed: "neutral",
  cancelled: "priority",
};

export default async function AdminEventsPage() {
  await requireArea("events");
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });

  // Registration counts read live. Event managers hold row access to
  // registrations through their own policy, so no function is needed here.
  const { data: registrations } = await supabase
    .from("event_registrations")
    .select("event_id, status");

  const counts = new Map<string, number>();
  for (const r of registrations ?? []) {
    if (r.status === "registered") counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
  }

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Admin</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">Events</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Capacity, deadlines and publication state are enforced in the database, so a closed event
          stays closed even if someone calls the API directly.
        </p>
      </header>

      <EventForm />

      <section className="space-y-4">
        <h2 className="text-lg leading-snug">All events</h2>

        {events && events.length > 0 ? (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                        <span className="text-xs text-muted">/{e.slug}</span>
                      </div>
                      <p className="font-medium text-ink">{e.title}</p>
                      <p className="text-sm text-muted">
                        {formatDate(e.starts_at, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                      <p className="text-sm text-muted">
                        {counts.get(e.id) ?? 0}
                        {e.capacity !== null ? ` of ${e.capacity}` : ""} registered
                      </p>
                    </div>

                    <StatusControl eventId={e.id} status={e.status} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Create one above. It starts as a draft."
          />
        )}
      </section>
    </Container>
  );
}
