import { createFileRoute } from "@tanstack/react-router";
import { AcademicPage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/academic")({
  head: () => ({ meta: [{ title: "Academic — School Admin" }] }),
  component: AcademicPage,
});
