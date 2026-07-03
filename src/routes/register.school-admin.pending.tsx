import { createFileRoute } from "@tanstack/react-router";
import { SchoolAdminApplicationPendingPage } from "@/components/layout/SchoolAdminApplicationPendingPage";

export const Route = createFileRoute("/register/school-admin/pending")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({
    meta: [{ title: "လျှောက်ထားမှု ပေးပို့ပြီးပါပြီ — Myanmar EDU" }],
  }),
  component: PendingPage,
});

function PendingPage() {
  const { id } = Route.useSearch();

  return (
    <div className="aqua-page">
      <SchoolAdminApplicationPendingPage applicationId={id} />
    </div>
  );
}
