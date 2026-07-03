import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — School Admin" }] }),
  component: AnalyticsPage,
});
