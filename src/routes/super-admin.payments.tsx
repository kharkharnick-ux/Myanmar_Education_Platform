import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";
import { FilterBar, FilterSelect } from "@/components/ui-kit/FilterBar";

export const Route = createFileRoute("/super-admin/payments")({
  head: () => ({ meta: [{ title: "ငွေပေးချေမှုများ — Admin" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <>
      <PageHeader title="ငွေပေးချေမှုများ" subtitle="ငွေပေးချေမှု မှတ်တမ်းများကို စစ်ဆေးပါ" />
      <FilterBar>
        <FilterSelect label="Payment Method" />
        <FilterSelect label="Status" />
      </FilterBar>
      <DataTable
        columns={["Payment ID", "ကျောင်း", "Amount", "Payment Method", "Transaction No", "Status"]}
        rows={[]}
        emptyIcon={CreditCard}
        emptyTitle="ငွေပေးချေမှု မှတ်တမ်းမရှိသေးပါ"
      />
    </>
  );
}