import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/layout";
import { Wordmark } from "@/components/site/wordmark";
import { AppNav, AppNavMobile } from "./app-nav";
import type { NavItem } from "./nav-config";

export function AppShell({
  items,
  name,
  showAdminLink = false,
  children,
}: {
  items: NavItem[];
  name: string;
  showAdminLink?: boolean;
  children: React.ReactNode;
}) {
  const firstName = name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sm">
        <Container width="wide" className="flex h-16 items-center gap-6">
          <Link href="/dashboard" className="shrink-0 rounded-sm">
            <Wordmark />
          </Link>

          <div className="flex-1">
            <AppNav items={items} />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Always visible, at every width. An organiser opening this on a
                phone still needs the way in, and hiding it below `sm` made it
                look as though the role had not been granted. */}
            {showAdminLink ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md border border-accent-line bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft/70"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                Admin
              </Link>
            ) : null}

            <span className="hidden text-sm text-muted sm:inline">{firstName}</span>

            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </button>
            </form>
          </div>
        </Container>
      </header>

      {/* Bottom padding leaves room for the fixed mobile nav. */}
      <main id="main" className="flex-1 pb-24 md:pb-0">
        {children}
      </main>

      <AppNavMobile items={items} />
    </div>
  );
}
