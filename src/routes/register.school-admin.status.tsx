import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ApplicationStatus = "pending" | "approved" | "rejected";

type ApplicationStatusRow = {
  id: string;
  full_name_mm: string | null;
  school_name: string | null;
  status: ApplicationStatus;
  rejection_reason: string | null;
  created_at: string | null;
  reviewed_at: string | null;
};

const myanmarDigits = "၀၁၂၃၄၅၆၇၈၉";

const toEnglishDigits = (value = "") =>
  value.replace(/[၀-၉]/g, (digit) => myanmarDigits.indexOf(digit).toString());

const sanitizeNrcLast6 = (value: string) =>
  toEnglishDigits(value).replace(/[^0-9]/g, "").slice(0, 6);

export const Route = createFileRoute("/register/school-admin/status")({
  head: () => ({
    meta: [{ title: "ကျောင်းလျှောက်ထားချက်များ — Myanmar EDU" }],
  }),
  component: SchoolAdminApplicationStatusPage,
});

function SchoolAdminApplicationStatusPage() {
  const [email, setEmail] = useState("");
  const [nrcLast6, setNrcLast6] = useState("");
  const [applications, setApplications] = useState<ApplicationStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNrcLast6 = sanitizeNrcLast6(nrcLast6);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setApplications([]);
    setSearched(false);

    if (!normalizedEmail) {
      setError("Email ဖြည့်သွင်းပေးပါ။");
      return;
    }

    if (!/^[0-9]{6}$/.test(normalizedNrcLast6)) {
      setError("NRC နောက်ဆုံးဂဏန်း ၆ လုံးကို မှန်ကန်စွာ ဖြည့်သွင်းပေးပါ။");
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "check_school_admin_application_status" as never,
        {
          input_email: normalizedEmail,
          input_nrc_last6: normalizedNrcLast6,
        } as never,
      );

      if (rpcError) throw rpcError;

      setApplications((data || []) as ApplicationStatusRow[]);
      setSearched(true);
    } catch (err) {
      console.error("School admin application status check failed:", err);
      setError("လျှောက်ထားချက်အခြေအနေ စစ်ဆေး၍မရသေးပါ။ နောက်မှထပ်ကြိုးစားပေးပါ။");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="aqua-page min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          to="/"
          className="glass-panel inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition hover:bg-accent/35"
        >
          <ArrowLeft className="h-4 w-4" />
          ပင်မစာမျက်နှာသို့
        </Link>

        <section className="aqua-card space-y-6 p-6 sm:p-8">
          <div className="text-center">
            <div className="theme-icon-tile-strong mx-auto mb-4 h-14 w-14 rounded-2xl">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold glow-text sm:text-3xl">ကျောင်းလျှောက်ထားချက်များ</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Email နှင့် NRC နောက်ဆုံးဂဏန်း ၆ လုံးဖြင့် သင့်လျှောက်ထားချက်အခြေအနေကို စစ်ဆေးနိုင်ပါသည်။
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="aqua-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">NRC နောက်ဆုံးဂဏန်း ၆ လုံး</span>
              <input
                value={nrcLast6}
                onChange={(event) => setNrcLast6(sanitizeNrcLast6(event.target.value))}
                className="aqua-input w-full rounded-2xl px-4 py-3 text-sm font-mono tracking-[0.2em] outline-none"
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="aqua-button mt-auto inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              စစ်ဆေးရန်
            </button>
          </form>

          {error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </section>

        {searched && applications.length === 0 && (
          <div className="glass-panel rounded-3xl p-6 text-center text-sm font-semibold text-muted-foreground">
            ဤ Email နှင့် NRC နံပါတ်ဖြင့် လျှောက်ထားချက် မရှိသေးပါ။
          </div>
        )}

        {applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ApplicationCard({ application }: { application: ApplicationStatusRow }) {
  const statusMessage =
    application.status === "approved"
      ? "သင့်လျှောက်ထားချက် အတည်ပြုပြီးပါပြီ။ Password သတ်မှတ်ရန် email တွင် link ပို့ပေးထားပါသည်။ Password သတ်မှတ်ပြီးပါက သင့် email နှင့် password ဖြင့် login ဝင်နိုင်ပါသည်။"
      : application.status === "rejected"
        ? "သင့်လျှောက်ထားချက်ကို ငြင်းပယ်ထားပါသည်။"
        : "သင့်လျှောက်ထားချက်ကို စစ်ဆေးနေဆဲဖြစ်ပါသည်။ Super Admin အတည်ပြုပြီးပါက သင့် email သို့ password သတ်မှတ်ရန် link ပေးပို့ပါမည်။";

  return (
    <article className="aqua-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{application.school_name || "-"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{application.full_name_mm || "-"}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoItem label="Submitted Date" value={formatDate(application.created_at)} />
        <InfoItem label="Reviewed Date" value={formatDate(application.reviewed_at)} />
      </div>

      <div className="glass-panel rounded-2xl p-4 text-sm leading-7 text-foreground">{statusMessage}</div>

      {application.status === "rejected" && application.rejection_reason && (
        <div className="rounded-2xl border border-destructive/35 bg-destructive/10 p-4 text-sm leading-7 text-destructive">
          {application.rejection_reason}
        </div>
      )}
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <p className="mt-2 text-sm font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold capitalize",
        status === "pending" && "border-primary/30 bg-primary/10 text-primary",
        status === "approved" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        status === "rejected" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {status}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("my-MM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
