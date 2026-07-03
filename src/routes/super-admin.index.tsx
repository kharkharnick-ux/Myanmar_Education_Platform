import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileClock, FileText, Inbox, School, UserCog } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { attachSchoolImageUrls } from "@/lib/school-images";

type DashboardCounts = {
  pendingApplications: number | null;
  approvedApplications: number | null;
  approvedSchools: number | null;
  activeSchoolAdmins: number | null;
};

type RecentRequest = {
  id: string;
  full_name_mm: string | null;
  school_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string | null;
};

type RecentSchool = {
  id: string;
  school_name: string;
  school_type: string;
  grade_from: string;
  grade_to: string;
  address: string | null;
  school_phone: string | null;
  school_email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  logoPreviewUrl?: string;
  coverPreviewUrl?: string;
  regions?: { name: string | null } | null;
  townships?: { name: string | null } | null;
};

export const Route = createFileRoute("/super-admin/")({
  head: () => ({ meta: [{ title: "Super Admin Dashboard - Myanmar EDU" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [counts, setCounts] = useState<DashboardCounts>({
    pendingApplications: null,
    approvedApplications: null,
    approvedSchools: null,
    activeSchoolAdmins: null,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [recentSchools, setRecentSchools] = useState<RecentSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setErrorMessage("");

      const [
        pendingApplications,
        approvedApplications,
        approvedSchools,
        activeSchoolAdmins,
        recentRequestResult,
        recentSchoolsResult,
      ] = await Promise.all([
        supabase
          .from("registration_requests")
          .select("id", { count: "exact", head: true })
          .eq("request_type", "school_admin")
          .eq("status", "pending"),
        supabase
          .from("registration_requests")
          .select("id", { count: "exact", head: true })
          .eq("request_type", "school_admin")
          .eq("status", "approved"),
        supabase
          .from("schools")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "school_admin")
          .eq("status", "active"),
        supabase
          .from("registration_requests")
          .select("id, full_name_mm, school_name, status, created_at")
          .eq("request_type", "school_admin")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("schools")
          .select(
            "id, school_name, school_type, grade_from, grade_to, address, school_phone, school_email, website, logo_url, cover_image_url, regions(name), townships(name)",
          )
          .eq("status", "approved")
          .order("approved_at", { ascending: false, nullsFirst: false })
          .limit(3),
      ]);

      const firstError =
        pendingApplications.error ||
        approvedApplications.error ||
        approvedSchools.error ||
        activeSchoolAdmins.error ||
        recentRequestResult.error ||
        recentSchoolsResult.error;

      if (firstError) {
        setErrorMessage(firstError.message);
      }

      setCounts({
        pendingApplications: pendingApplications.count,
        approvedApplications: approvedApplications.count,
        approvedSchools: approvedSchools.count,
        activeSchoolAdmins: activeSchoolAdmins.count,
      });
      setRecentRequests((recentRequestResult.data || []) as RecentRequest[]);

      const schoolRows = await Promise.all(
        ((recentSchoolsResult.data || []) as RecentSchool[]).map((school) => attachSchoolImageUrls(school)),
      );
      setRecentSchools(schoolRows as RecentSchool[]);
      setLoading(false);
    };

    fetchDashboard();
  }, []);

  const kpis = useMemo(
    () => [
      {
        label: "စောင့်ဆိုင်းနေသော လျှောက်လွှာများ",
        value: counts.pendingApplications,
        icon: FileClock,
        href: "/super-admin/school-admin-applications",
      },
      {
        label: "အတည်ပြုပြီး လျှောက်လွှာများ",
        value: counts.approvedApplications,
        icon: CheckCircle2,
        href: "/super-admin/school-admin-applications",
      },
      {
        label: "အတည်ပြုပြီး ကျောင်းများ",
        value: counts.approvedSchools,
        icon: School,
        href: "/super-admin/schools",
      },
      {
        label: "Active School Admin များ",
        value: counts.activeSchoolAdmins,
        icon: UserCog,
        href: "/super-admin/school-admins",
      },
    ],
    [counts],
  );

  return (
    <>
      <PageHeader title="Super Admin Dashboard" subtitle="Myanmar Education ERP အတွက် database ချိတ်ဆက်ထားသော overview" />

      {errorMessage && (
        <div className="glass-panel mb-4 rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} to={kpi.href} className="block">
              <GlassCard className="relative overflow-hidden">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-xs text-muted-foreground">{kpi.label}</div>
                    <div className="mt-2 text-3xl font-bold glow-text">
                      {loading ? "..." : kpi.value ?? "-"}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Supabase database မှတိုက်ရိုက်ဖတ်ထားသည်</div>
                  </div>
                  <div className="theme-icon-tile-strong h-12 w-12 shrink-0 rounded-xl">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <GlassCard className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Recent School Admin Applications</h3>
              <p className="text-xs text-muted-foreground">registration_requests table မှ နောက်ဆုံးလျှောက်ထားချက်များ</p>
            </div>
            <FileText className="h-5 w-5 text-primary" />
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading applications...</div>
          ) : recentRequests.length ? (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-background/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{request.school_name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{request.full_name_mm || "-"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDate(request.created_at)}</span>
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Inbox} title="လျှောက်လွှာမရှိသေးပါ" description="registration_requests table တွင် school_admin request မရှိသေးပါ။" />
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent Approved Schools</h3>
            <School className="h-5 w-5 text-primary" />
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading schools...</div>
          ) : recentSchools.length ? (
            <div className="space-y-3">
              {recentSchools.map((school) => (
                <Link
                  key={school.id}
                  to="/super-admin/schools"
                  className="block rounded-2xl border border-border/50 bg-background/20 p-3 transition hover:bg-accent/20"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-primary/10 text-primary"
                      style={{
                        background: school.coverPreviewUrl ? `center/cover url(${school.coverPreviewUrl})` : undefined,
                      }}
                    >
                      {school.logoPreviewUrl ? (
                        <img src={school.logoPreviewUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <School className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{school.school_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {school.school_type} • {school.grade_from} to {school.grade_to}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {school.regions?.name || "-"} {school.townships?.name ? `/ ${school.townships.name}` : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={School}
              title="Approved school မရှိသေးပါ"
              description="schools table တွင် approved school ရှိလာပါက ဤနေရာတွင်ပြသပါမည်။"
            />
          )}
        </GlassCard>
      </section>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize",
        status === "approved" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
        status === "pending" && "bg-primary/15 text-primary",
        status === "rejected" && "bg-destructive/15 text-destructive",
      )}
    >
      {status}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("my-MM", { dateStyle: "medium" }).format(new Date(value));
}
