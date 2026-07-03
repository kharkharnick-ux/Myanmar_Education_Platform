import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings as SettingsIcon, CalendarRange, MapPin, Building2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { PillTabs } from "@/components/ui-kit/Tabs";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "စနစ်ဆက်တင်များ" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [tab, setTab] = useState("general");
  return (
    <AppShell>
      <PageHeader title="စနစ်ဆက်တင်များ" subtitle="System Configuration" />
      <PillTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "general", label: "General" },
          { value: "years", label: "Academic Years" },
          { value: "regions", label: "Regions" },
          { value: "townships", label: "Townships" },
        ]}
      />

      {tab === "general" && (
        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="theme-icon-tile-strong h-10 w-10 rounded-xl">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">General Settings</h3>
              <p className="text-xs text-muted-foreground">စနစ်အထွေထွေ ဆက်တင်များ</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "စနစ်အမည်", value: "Myanmar Education ERP" },
              { label: "ပင်မဘာသာစကား", value: "မြန်မာ (Burmese)" },
              { label: "Time Zone", value: "Asia/Yangon (UTC+6:30)" },
              { label: "Currency", value: "MMK (ကျပ်)" },
            ].map((f) => (
              <div key={f.label} className="glass-panel p-4">
                <div className="text-xs text-muted-foreground mb-1">{f.label}</div>
                <div className="font-medium">{f.value}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {tab === "years" && (
        <GlassCard>
          <EmptyState icon={CalendarRange} title="ပညာသင်နှစ်မရှိသေးပါ" description="Academic Years များ ထည့်သွင်းပါ။" />
        </GlassCard>
      )}
      {tab === "regions" && (
        <GlassCard>
          <EmptyState icon={MapPin} title="တိုင်း/ပြည်နယ်မရှိသေးပါ" description="တိုင်း/ပြည်နယ်များ ထည့်သွင်းပါ။" />
        </GlassCard>
      )}
      {tab === "townships" && (
        <GlassCard>
          <EmptyState icon={Building2} title="မြို့နယ်မရှိသေးပါ" description="မြို့နယ်များ ထည့်သွင်းပါ။" />
        </GlassCard>
      )}
    </AppShell>
  );
}
