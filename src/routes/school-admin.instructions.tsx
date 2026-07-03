import { createFileRoute } from "@tanstack/react-router";
import { InstructionsPage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/instructions")({
  head: () => ({ meta: [{ title: "Instructions — School Admin" }] }),
  component: InstructionsPage,
});
