import { createFileRoute } from "@tanstack/react-router";
import { School, GraduationCap, Users, Wallet, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { EmptyState } from "@/components/ui-kit/EmptyState";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "အစီရင်ခံစာများ" }] }),
  component: ReportsPage,
});

const REPORTS = [
  { icon: School, title: "School Reports", desc: "ကျောင်းဆိုင်ရာ အစီရင်ခံစာများ" },
  { icon: GraduationCap, title: "Student Reports", desc: "ကျောင်းသား အစီရင်ခံစာများ" },
  { icon: Users, title: "Teacher Reports", desc: "ဆရာ အစီရင်ခံစာများ" },
  { icon: Wallet, title: "Financial Reports", desc: "ဘဏ္ဍာရေး အစီရင်ခံစာများ" },
];

function ReportsPage() {
  return (
    <AppShell>
      <PageHeader title="အစီရင်ခံစာများ" subtitle="အစီရင်ခံစာများကို ထုတ်ယူပါ" />
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <GlassCard key={r.title} className="group cursor-pointer">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.75_0.22_225)] to-[oklch(0.55_0.25_260)] glow-ring mb-4">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1">{r.title}</h3>
              <p className="text-xs text-muted-foreground mb-4">{r.desc}</p>
              <div className="flex flex-wrap gap-2">
                <button className="glass-panel inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs hover:glow-ring transition-all">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </button>
                <button className="glass-panel inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs hover:glow-ring transition-all">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </button>
                <button className="glass-panel inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs hover:glow-ring transition-all">
                  <FileDown className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
            </GlassCard>
          );
        })}
      </section>
      <EmptyState title="ဒေတာမရှိသေးပါ" description="အစီရင်ခံစာများ ထုတ်ယူရန် ဒေတာများ လိုအပ်ပါသည်။" />
    </AppShell>
  );
}
