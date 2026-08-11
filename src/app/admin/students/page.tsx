import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };

const LIVING_LABELS: Record<string, string> = {
  hostel: "Hostel",
  pg: "PG / rented",
  day_scholar: "Day scholar",
};

const PAGE_SIZE = 50;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; batch?: string; living?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, batch_year, program, living_situation, profile_completed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  // Filters are applied in the database, not in JavaScript, so RLS and indexes
  // both still do their job.
  const q = params.q?.trim();
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (params.batch) query = query.eq("batch_year", Number(params.batch));
  if (params.living) {
    query = query.eq("living_situation", params.living as "hostel" | "pg" | "day_scholar");
  }
  if (params.status === "complete") query = query.not("profile_completed_at", "is", null);
  if (params.status === "incomplete") query = query.is("profile_completed_at", null);

  const [{ data: students }, { data: allBatches }] = await Promise.all([
    query,
    supabase.from("profiles").select("batch_year").not("batch_year", "is", null),
  ]);

  const batchOptions = [
    ...new Set((allBatches ?? []).map((b) => b.batch_year).filter(Boolean)),
  ].sort() as number[];

  const rows = students ?? [];

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Admin</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">Students</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Account and segmentation records. Assessment answers and wellness scores are not
          accessible from here.
        </p>
      </header>

      <Card>
        <CardContent className="p-5">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Name or email" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch">Batch</Label>
              <Select id="batch" name="batch" defaultValue={params.batch ?? ""}>
                <option value="">All batches</option>
                {batchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="living">Living situation</Label>
              <Select id="living" name="living" defaultValue={params.living ?? ""}>
                <option value="">All</option>
                {Object.entries(LIVING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="status">Profile</Label>
                <Select id="status" name="status" defaultValue={params.status ?? ""}>
                  <option value="">Any</option>
                  <option value="complete">Completed</option>
                  <option value="incomplete">Incomplete</option>
                </Select>
              </div>
              <Button type="submit" variant="secondary" className="self-end">
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students match"
          description="Adjust the filters, or wait for the first registrations to come in."
        />
      ) : (
        <>
          {/* Table on desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Name", "Email", "Batch", "Course", "Living", "Joined", "Profile"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-paper">
                    <td className="px-5 py-3 font-medium text-ink">{s.full_name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">{s.email}</td>
                    <td className="px-5 py-3 tabular-nums text-muted">{s.batch_year ?? "—"}</td>
                    <td className="max-w-56 truncate px-5 py-3 text-muted">{s.program ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">
                      {s.living_situation ? LIVING_LABELS[s.living_situation] : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDate(s.created_at)}</td>
                    <td className="px-5 py-3">
                      {s.profile_completed_at ? (
                        <Badge tone="good">Complete</Badge>
                      ) : (
                        <Badge tone="neutral">Pending</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Cards on mobile */}
          <ul className="space-y-3 md:hidden">
            {rows.map((s) => (
              <li key={s.id}>
                <Card>
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{s.full_name ?? "—"}</p>
                        <p className="truncate text-sm text-muted">{s.email}</p>
                      </div>
                      {s.profile_completed_at ? (
                        <Badge tone="good">Complete</Badge>
                      ) : (
                        <Badge tone="neutral">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted">
                      {[
                        s.batch_year,
                        s.program,
                        s.living_situation ? LIVING_LABELS[s.living_situation] : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No details yet"}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted">
            Showing {rows.length} record{rows.length === 1 ? "" : "s"}
            {rows.length === PAGE_SIZE ? ` (first ${PAGE_SIZE}; refine the filters to narrow down)` : ""}.
          </p>
        </>
      )}
    </Container>
  );
}
