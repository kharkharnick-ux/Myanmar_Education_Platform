import { createFileRoute } from "@tanstack/react-router";
import { School } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";
import { FilterBar, FilterSelect } from "@/components/ui-kit/FilterBar";

export const Route = createFileRoute("/super-admin/schools")({
  head: () => ({ meta: [{ title: "ကျောင်းများ စီမံရန် — Admin" }] }),
  component: AdminSchoolsPage,
});

function AdminSchoolsPage() {
  return (
    <>
      <PageHeader title="ကျောင်းများ" subtitle="အတည်ပြုပြီး ကျောင်းများအားလုံး" />
      <FilterBar>
        <FilterSelect label="ကျောင်းအမျိုးအစား" />
        <FilterSelect label="တိုင်း/ပြည်နယ်" />
        <FilterSelect label="မြို့နယ်" />
      </FilterBar>
      <DataTable
        columns={["ကျောင်းအမည်", "အမျိုးအစား", "Grade Range", "တိုင်း/ပြည်နယ်", "မြို့နယ်", "အခြေအနေ", "လုပ်ဆောင်ချက်"]}
        rows={[]}
        emptyIcon={School}
      />
    </>
  );
}