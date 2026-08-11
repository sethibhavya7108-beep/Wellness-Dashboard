import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs before every matched request: refreshes the Supabase session cookie and
 * bounces signed-out visitors away from protected routes.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy`.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets. Auth cookies must be refreshed on
    // navigation, so this stays deliberately broad.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
