import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Clock3, FileText, Home } from "lucide-react";
import { GlassCard } from "@/components/ui-kit/GlassCard";

export function SchoolAdminApplicationPendingPage({ applicationId }: { applicationId?: string }) {
  const submittedDate = new Intl.DateTimeFormat("my-MM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-4 py-12 sm:px-6">
      <GlassCard className="relative w-full overflow-hidden rounded-[2rem] p-6 text-center sm:p-10">
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/10 text-primary shadow-[0_0_36px_hsl(var(--primary)/0.35)]">
          <Clock3 className="h-10 w-10" />
        </div>

        <p className="aqua-section-title mb-3 text-xs uppercase tracking-[0.28em]">Application Submitted</p>
        <h1 className="text-2xl font-bold glow-text sm:text-4xl">လျှောက်ထားမှု ပေးပို့ပြီးပါပြီ</h1>
        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
          <CalendarClock className="h-4 w-4" />
          အတည်ပြုချက်ကို စောင့်ဆိုင်းနေသည်
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">
          သင်၏ ကျောင်းအုပ်ချုပ်ရေးအကောင့် လျှောက်ထားမှုနှင့် ကျောင်းအချက်အလက်များကို Super Admin ထံ
          ပေးပို့ပြီးပါပြီ။ စစ်ဆေးအတည်ပြုပြီးနောက် ဆက်သွယ်ပေးပါမည်။
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-muted-foreground">
          အတည်ပြုချက်မရမချင်း School Admin Dashboard သို့ ဝင်ရောက်နိုင်မည်မဟုတ်ပါ။
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoTile icon={FileText} label="Application ID" value={applicationId || "-"} />
          <InfoTile icon={CalendarClock} label="Submitted Date" value={submittedDate} />
          <InfoTile icon={CheckCircle2} label="Status" value="pending" />
        </div>

        <div className="mt-8">
          <Link
            to="/"
            className="aqua-button inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            <Home className="h-4 w-4" />
            ပင်မစာမျက်နှာသို့ ပြန်သွားမည်
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-4 text-left">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-bold">{value}</p>
    </div>
  );
}
