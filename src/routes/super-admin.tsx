import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
