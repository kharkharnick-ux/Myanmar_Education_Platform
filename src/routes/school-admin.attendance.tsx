import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "@/components/layout/school-admin-dashboard";

export const Route = createFileRoute("/school-admin/attendance")({
  head: () => ({ meta: [{ title: "Attendance — School Admin" }] }),
  component: AttendancePage,
});
