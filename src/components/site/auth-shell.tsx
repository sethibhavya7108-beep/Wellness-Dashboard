import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/layout";
import { Wordmark } from "./wordmark";

/** Minimal chrome for sign-in and onboarding: no navigation to get lost in. */
export function AuthShell({
  children,
  width = "narrow",
  backHref = "/",
  backLabel = "Back to home",
}: {
  children: React.ReactNode;
  width?: "narrow" | "default";
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="rounded-sm">
            <Wordmark />
          </Link>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {backLabel}
          </Link>
        </Container>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center py-12 sm:py-16">
        <Container width={width}>{children}</Container>
      </main>

      <footer className="border-t border-line py-5">
        <Container>
          <p className="text-xs text-muted">
            NationBuilding Impact Chapter, SSCBS · Campus Wellness does not diagnose or give medical
            advice.
          </p>
        </Container>
      </footer>
    </div>
  );
}
