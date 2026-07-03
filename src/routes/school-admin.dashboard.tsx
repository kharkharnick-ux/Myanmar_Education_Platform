import { createFileRoute } from "@tanstack/react-router";
import { SchoolAdminDashboardOverview } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/dashboard")({
  head: () => ({ meta: [{ title: "School Admin Dashboard — Myanmar EDU" }] }),
  component: SchoolAdminDashboardOverview,
});
