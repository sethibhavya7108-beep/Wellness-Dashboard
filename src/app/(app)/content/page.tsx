import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Learn" };

export default async function ContentPage() {
  await requireOnboardedUser("/content");
  const supabase = await createClient();

  // The RLS policy already restricts anonymous and student reads to published
  // rows; the filter is here so the query says what it means.
  const { data: posts } = await supabase
    .from("content")
    .select("id, slug, title, type, summary, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Learn</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">From the chapter</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Awareness posts, challenge results and event highlights. Anything making a health claim
          cites its source.
        </p>
      </header>

      {posts && posts.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-2 p-6">
                  <Badge tone="accent">{p.type.replace(/_/g, " ")}</Badge>
                  <h2 className="text-lg leading-snug">
                    <Link href={`/content/${p.slug}`} className="hover:text-accent">
                      {p.title}
                    </Link>
                  </h2>
                  {p.summary ? (
                    <p className="flex-1 text-sm leading-relaxed text-muted">{p.summary}</p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {p.published_at ? (
                    <p className="text-xs text-muted">{formatDate(p.published_at)}</p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Nothing published yet"
          description="Awareness posts and event highlights will appear here."
        />
      )}
    </Container>
  );
}
