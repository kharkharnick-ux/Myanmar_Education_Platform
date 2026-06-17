import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { EmptyState } from "@/components/ui-kit/EmptyState";

export const Route = createFileRoute("/super-admin/activity")({
  head: () => ({ meta: [{ title: "လုပ်ဆောင်မှုမှတ်တမ်းများ — Admin" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <>
      <PageHeader title="လုပ်ဆောင်မှုမှတ်တမ်းများ" subtitle="အသုံးပြုသူများ၏ လုပ်ဆောင်ချက် Timeline" />
      <GlassCard>
        <EmptyState
          icon={Activity}
          title="မှတ်တမ်းမရှိသေးပါ"
          description="အသုံးပြုသူများ၏ လုပ်ဆောင်ချက်များကို ဤနေရာတွင် Timeline အဖြစ် ပြသပါမည်။"
        />
      </GlassCard>
    </>
  );
}