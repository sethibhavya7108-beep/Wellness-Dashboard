import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function ContentPostPage({ params }: Props) {
  const { slug } = await params;
  await requireOnboardedUser(`/content/${slug}`);
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("content")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) notFound();

  const { data: source } = post.source_id
    ? await supabase
        .from("sources")
        .select("organization, title, url, published_year")
        .eq("id", post.source_id)
        .maybeSingle()
    : { data: null };

  return (
    <Container width="narrow" className="space-y-6 py-10">
      <Link href="/content" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        All posts
      </Link>

      <header className="space-y-3">
        <Badge tone="accent">{post.type.replace(/_/g, " ")}</Badge>
        <h1 className="text-3xl leading-tight">{post.title}</h1>
        {post.published_at ? (
          <p className="text-sm text-muted">{formatDate(post.published_at)}</p>
        ) : null}
        {post.summary ? (
          <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{post.summary}</p>
        ) : null}
      </header>

      {post.body ? (
        <div className="space-y-4 text-[0.9375rem] leading-relaxed text-ink-soft">
          {post.body.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : null}

      {source ? (
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Source</p>
            <p className="text-sm text-ink">
              {source.organization}
              {source.published_year ? ` (${source.published_year})` : ""}
            </p>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent underline underline-offset-4"
              >
                {source.title}
              </a>
            ) : (
              <p className="text-sm text-muted">{source.title}</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <p className="border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Campus Wellness supports everyday habits. It does not diagnose, treat or give medical
        advice.
      </p>
    </Container>
  );
}
