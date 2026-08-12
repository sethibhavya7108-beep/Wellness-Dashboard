import type { Metadata } from "next";
import { Container } from "@/components/ui/layout";
import { requireAdmin } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { TeamManager, type TeamMember } from "./team-manager";

export const metadata: Metadata = { title: "Team and roles" };

export default async function AdminTeamPage() {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase.rpc("list_team");

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Admin</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">Team and roles</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Authorization is by role, never by email address. Only a super admin can grant or revoke,
          which is what stops an ordinary admin promoting themselves — and the last super admin
          cannot be removed, because there would be no way back in.
        </p>
      </header>

      <TeamManager
        members={(data ?? []) as TeamMember[]}
        canManage={hasRole(ctx.roles, "super_admin")}
      />
    </Container>
  );
}
