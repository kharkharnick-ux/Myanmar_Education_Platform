import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import {
  FileClock, School, GraduationCap, Users, CreditCard, LifeBuoy,
  TrendingUp, Activity, FileText, Inbox,
} from "lucide-react";

export const Route = createFileRoute("/super-admin/")({
  head: () => ({ meta: [{ title: "Super Admin Dashboard — Myanmar EDU" }] }),
  component: Dashboard,
});

const KPIS = [
  { label: "စောင့်ဆိုင်းနေသော လျှောက်လွှာများ", icon: FileClock, accent: "from-[oklch(0.75_0.20_225)] to-[oklch(0.55_0.25_260)]" },
  { label: "ကျောင်းစုစုပေါင်း", icon: School, accent: "from-[oklch(0.70_0.22_200)] to-[oklch(0.55_0.20_230)]" },
  { label: "ကျောင်းသားစုစုပေါင်း", icon: GraduationCap, accent: "from-[oklch(0.65_0.22_260)] to-[oklch(0.50_0.20_280)]" },
  { label: "ဆရာစုစုပေါင်း", icon: Users, accent: "from-[oklch(0.78_0.18_210)] to-[oklch(0.60_0.22_240)]" },
  { label: "ငွေပေးချေမှုစစ်ဆေးရန်", icon: CreditCard, accent: "from-[oklch(0.72_0.20_215)] to-[oklch(0.55_0.25_255)]" },
  { label: "Support Tickets", icon: LifeBuoy, accent: "from-[oklch(0.80_0.16_195)] to-[oklch(0.58_0.22_245)]" },
];

function Dashboard() {
  return (
    <>
      <PageHeader title="Super Admin Dashboard" subtitle="ခြုံငုံကြည့်ရှုခြင်း — Myanmar Education ERP" />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <GlassCard key={k.label} className="relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{k.label}</div>
                  <div className="mt-2 text-3xl font-bold glow-text">—</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">ဒေတာမရှိသေးပါ</div>
                </div>
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${k.accent} text-white glow-ring`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <GlassCard className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-5">
            <div>
              <h3 className="font-semibold">Registration Trend</h3>
              <p className="text-xs text-muted-foreground">ကျောင်းမှတ်ပုံတင်ခြင်း လမ်းကြောင်း</p>
            </div>
            <TrendingUp className="h-5 w-5 text-[var(--neon)]" />
          </div>
          <div className="h-64 grid place-items-center">
            <EmptyState icon={TrendingUp} title="ဒေတာမရှိသေးပါ" description="လျှောက်လွှာများ ဝင်ရောက်လာပါက Trend ပြသပါမည်။" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Revenue Overview</h3>
            <CreditCard className="h-5 w-5 text-[var(--neon)]" />
          </div>
          <div className="h-64 grid place-items-center">
            <EmptyState icon={CreditCard} title="ဝင်ငွေမရှိသေးပါ" description="ငွေပေးချေမှုများ မှတ်တမ်းတင်ပြီးပါက ပြသပါမည်။" />
          </div>
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Activities</h3>
            <Activity className="h-5 w-5 text-[var(--neon)]" />
          </div>
          <EmptyState icon={Activity} title="လုပ်ဆောင်ချက်မရှိသေးပါ" description="အသုံးပြုသူများ၏ လုပ်ဆောင်ချက်များ ဤနေရာတွင် ပြသပါမည်။" />
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Pending Applications</h3>
            <FileText className="h-5 w-5 text-[var(--neon)]" />
          </div>
          <EmptyState icon={Inbox} title="စောင့်ဆိုင်းနေသော လျှောက်လွှာမရှိပါ" description="အသစ်ဝင်ရောက်လာသော လျှောက်လွှာများ ဤနေရာတွင် ပြသပါမည်။" />
        </GlassCard>
      </section>
    </>
  );
}
