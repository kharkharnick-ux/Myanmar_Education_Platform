import { createFileRoute } from "@tanstack/react-router";
import { DocumentsPage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/documents")({
  head: () => ({ meta: [{ title: "Documents — School Admin" }] }),
  component: DocumentsPage,
});
