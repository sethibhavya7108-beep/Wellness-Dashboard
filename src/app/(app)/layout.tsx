import { AppShell } from "@/components/app/app-shell";
import { STUDENT_NAV } from "@/components/app/nav-config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";

/**
 * Every route in this group requires a signed-in student who has completed
 * profile setup. This check runs on the server on every request — the proxy
 * redirect is only a fast path, not the authorization boundary.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOnboardedUser();

  return (
    <AppShell
      items={STUDENT_NAV}
      name={ctx.profile?.full_name ?? ""}
      showAdminLink={isAdmin(ctx.roles)}
    >
      {children}
    </AppShell>
  );
}
