import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Wordmark } from "./wordmark";

const links = [
  { href: "#why", label: "Why it matters" },
  { href: "#how", label: "How it works" },
  { href: "#evidence", label: "Evidence" },
];

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="rounded-sm">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <Link
          href={signedIn ? "/dashboard" : "/login"}
          className={buttonClasses({ variant: signedIn ? "secondary" : "primary", size: "sm" })}
        >
          {signedIn ? "Go to dashboard" : "Sign in"}
        </Link>
      </Container>
    </header>
  );
}
