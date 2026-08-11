import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { siteUrl } from "@/lib/env";
import "./globals.css";

/*
 * Fonts are self-hosted rather than fetched from Google Fonts: no third-party
 * request at runtime, no dependency on fonts.googleapis.com being reachable at
 * build time, and correct fallback metrics from next/font.
 * Files extracted from the Fontsource variable packages (SIL Open Font License).
 */
const fraunces = localFont({
  src: "../fonts/fraunces-latin-wght-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const inter = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Campus Wellness — NationBuilding Impact Chapter, SSCBS",
    template: "%s · Campus Wellness",
  },
  description:
    "A preventive-health platform for SSCBS students: a short baseline check, a personalised roadmap of small daily habits, and campus wellness events.",
  openGraph: {
    type: "website",
    siteName: "Campus Wellness",
    title: "Build healthier habits. Build a healthier campus.",
    description:
      "A preventive-health platform for SSCBS students, built by the NationBuilding Impact Chapter.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#faf8f4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
