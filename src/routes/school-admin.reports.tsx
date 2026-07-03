import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/reports")({
  head: () => ({ meta: [{ title: "Reports — School Admin" }] }),
  component: ReportsPage,
});
