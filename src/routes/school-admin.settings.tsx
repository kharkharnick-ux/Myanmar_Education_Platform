import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/settings")({
  head: () => ({ meta: [{ title: "Settings — School Admin" }] }),
  component: SettingsPage,
});
