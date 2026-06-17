import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";
import { FilterBar, FilterSelect } from "@/components/ui-kit/FilterBar";
import { PillTabs } from "@/components/ui-kit/Tabs";

export const Route = createFileRoute("/super-admin/applications")({
  head: () => ({ meta: [{ title: "ကျောင်းလျှောက်လွှာများ" }] }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [tab, setTab] = useState("all");
  return (
    <>
      <PageHeader
        title="ကျောင်းလျှောက်လွှာများ"
        subtitle="ဝင်ရောက်လာသော လျှောက်လွှာများကို စီမံပါ"
        actions={
          <button className="glass-panel inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm glow-ring">
            <Plus className="h-4 w-4" /> အသစ်ထည့်ရန်
          </button>
        }
      />

      <PillTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "အားလုံး" },
          { value: "pending", label: "စောင့်ဆိုင်းနေ" },
          { value: "approved", label: "အတည်ပြုပြီး" },
          { value: "rejected", label: "ငြင်းပယ်ပြီး" },
        ]}
      />

      <FilterBar>
        <FilterSelect label="ကျောင်းအမျိုးအစား" />
        <FilterSelect label="တိုင်း/ပြည်နယ်" />
        <FilterSelect label="မြို့နယ်" />
      </FilterBar>

      <DataTable
        columns={["ကျောင်းအမည်", "အမျိုးအစား", "Grade Range", "တိုင်း/ပြည်နယ်", "မြို့နယ်", "တင်သွင်းရက်", "အခြေအနေ"]}
        rows={[]}
        emptyIcon={FileText}
        emptyTitle="လျှောက်လွှာမရှိသေးပါ"
        emptyDescription="ဝင်ရောက်လာသော လျှောက်လွှာများကို ဤနေရာတွင် ပြသပါမည်။"
      />
    </>
  );
}
