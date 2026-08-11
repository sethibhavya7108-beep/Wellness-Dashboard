import Link from "next/link";
import { Container } from "@/components/ui/layout";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <Container className="flex flex-col gap-10 py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm space-y-3">
            <Wordmark />
            <p className="text-sm leading-relaxed text-muted">
              A preventive-health platform built by the NationBuilding Impact Chapter at Shaheed
              Sukhdev College of Business Studies, University of Delhi.
            </p>
          </div>

          <div className="flex gap-14 text-sm">
            <div className="space-y-2.5">
              <p className="font-medium text-ink">Platform</p>
              <Link href="/login" className="block text-muted transition-colors hover:text-ink">
                Sign in
              </Link>
              <a href="#how" className="block text-muted transition-colors hover:text-ink">
                How it works
              </a>
              <a href="#evidence" className="block text-muted transition-colors hover:text-ink">
                Evidence
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-line bg-raised px-4 py-3">
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-medium text-ink-soft">Not a medical service.</span> Campus Wellness
            supports everyday habits. It does not diagnose, treat or give medical advice. If
            something about your health worries you, please speak to a qualified doctor.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NationBuilding Impact Chapter, SSCBS.</p>
          <p>Open only to students with an approved college email address.</p>
        </div>
      </Container>
    </footer>
  );
}
