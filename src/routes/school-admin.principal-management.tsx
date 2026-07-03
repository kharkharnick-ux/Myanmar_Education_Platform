import { createFileRoute } from "@tanstack/react-router";
import { PrincipalManagementPage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/principal-management")({
  head: () => ({ meta: [{ title: "Principal Management — School Admin" }] }),
  component: PrincipalManagementPage,
});
