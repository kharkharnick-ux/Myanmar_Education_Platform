import { createFileRoute } from "@tanstack/react-router";
import { SchoolAdminApplicationsReview } from "@/components/layout/SchoolAdminApplicationsReview";

export const Route = createFileRoute("/super-admin/school-admin-applications")({
  head: () => ({
    meta: [{ title: "School Admin Applications — Myanmar EDU" }],
  }),
  component: SchoolAdminApplicationsPage,
});

function SchoolAdminApplicationsPage() {
  return <SchoolAdminApplicationsReview />;
}
