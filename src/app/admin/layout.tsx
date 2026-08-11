import { AppShell } from "@/components/app/app-shell";
import { ADMIN_NAV } from "@/components/app/nav-config";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Server-side authorization for the whole admin area. A student who guesses the
 * URL is redirected before any admin markup is rendered, and every underlying
 * table is additionally protected by RLS.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();

  return (
    <AppShell items={ADMIN_NAV} name={ctx.profile?.full_name ?? "Admin"}>
      {children}
    </AppShell>
  );
}
