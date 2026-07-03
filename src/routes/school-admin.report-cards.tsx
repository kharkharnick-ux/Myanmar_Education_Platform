import { createFileRoute } from "@tanstack/react-router";
import { ReportCardsPage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/report-cards")({
  head: () => ({ meta: [{ title: "Report Cards — School Admin" }] }),
  component: ReportCardsPage,
});
