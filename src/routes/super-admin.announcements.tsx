import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";

export const Route = createFileRoute("/super-admin/announcements")({
  head: () => ({ meta: [{ title: "ကြေညာချက်များ — Admin" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  return (
    <>
      <PageHeader
        title="ကြေညာချက်များ"
        subtitle="စနစ်အတွင်း ကြေညာချက်များ ထုတ်ပြန်ပါ"
        actions={
          <button className="glass-panel inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm glow-ring">
            <Plus className="h-4 w-4" /> ကြေညာချက် အသစ်
          </button>
        }
      />
      <DataTable
        columns={["Title", "Audience", "Publish Date", "Status"]}
        rows={[]}
        emptyIcon={Megaphone}
        emptyTitle="ကြေညာချက်မရှိသေးပါ"
      />
    </>
  );
}