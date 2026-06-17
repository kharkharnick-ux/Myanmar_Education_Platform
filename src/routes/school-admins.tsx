import { createFileRoute } from "@tanstack/react-router";
import { UserCog, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";
import { FilterBar } from "@/components/ui-kit/FilterBar";

export const Route = createFileRoute("/school-admins")({
  head: () => ({ meta: [{ title: "ကျောင်း Admin များ — Admin" }] }),
  component: AdminsPage,
});

function AdminsPage() {
  return (
    <>
      <PageHeader
        title="ကျောင်း Admin များ"
        subtitle="ကျောင်းအလိုက် တာဝန်ပေးထားသော Admin များ"
        actions={
          <button className="glass-panel inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm glow-ring">
            <Plus className="h-4 w-4" /> Admin အသစ်
          </button>
        }
      />
      <FilterBar />
      <DataTable
        columns={["အမည်", "Email", "Phone", "တည်ထားသည့်ကျောင်း", "Last Login", "Status"]}
        rows={[]}
        emptyIcon={UserCog}
        emptyTitle="Admin မှတ်တမ်းမရှိသေးပါ"
      />
    </>
  );
}