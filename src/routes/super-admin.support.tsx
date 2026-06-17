import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";
import { FilterBar, FilterSelect } from "@/components/ui-kit/FilterBar";

export const Route = createFileRoute("/super-admin/support")({
  head: () => ({ meta: [{ title: "အကူအညီတောင်းခံမှုများ — Admin" }] }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <>
      <PageHeader title="အကူအညီတောင်းခံမှုများ" subtitle="Support Tickets စီမံခန့်ခွဲမှု" />
      <FilterBar>
        <FilterSelect label="Priority" />
        <FilterSelect label="Status" />
      </FilterBar>
      <DataTable
        columns={["Ticket No", "School", "Subject", "Priority", "Status"]}
        rows={[]}
        emptyIcon={LifeBuoy}
        emptyTitle="Ticket မရှိသေးပါ"
        emptyDescription="ဝင်ရောက်လာသော အကူအညီတောင်းခံမှုများကို ဤနေရာတွင် ပြသပါမည်။"
      />
    </>
  );
}