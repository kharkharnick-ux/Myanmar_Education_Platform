import { createFileRoute } from "@tanstack/react-router";
import { SchoolProfilePage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/school-profile")({
  head: () => ({ meta: [{ title: "School Profile — School Admin" }] }),
  component: SchoolProfilePage,
});
