import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";
import { FilterBar, FilterSelect } from "@/components/ui-kit/FilterBar";
import { PillTabs } from "@/components/ui-kit/Tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ApplicationRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  full_name_mm: string | null;
  email: string | null;
  phone: string | null;
  school_name: string | null;
  school_type: string | null;
  grade_from: string | null;
  grade_to: string | null;
  region_id: number | null;
  school_township_id: number | null;
  created_at: string | null;
};

type RegionRow = {
  id: number;
  name: string;
};

type TownshipRow = {
  id: number;
  name: string;
};

export const Route = createFileRoute("/super-admin/applications")({
  head: () => ({ meta: [{ title: "ကျောင်းလျှောက်လွှာများ" }] }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [tab, setTab] = useState("all");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [townships, setTownships] = useState<TownshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [townshipFilter, setTownshipFilter] = useState("");

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      setErrorMessage("");

      const [applicationResult, regionResult, townshipResult] = await Promise.all([
        supabase
          .from("registration_requests")
          .select(
            "id, status, full_name_mm, email, phone, school_name, school_type, grade_from, grade_to, region_id, school_township_id, created_at",
          )
          .eq("request_type", "school_admin")
          .order("created_at", { ascending: false }),
        supabase.from("regions").select("id, name").order("name", { ascending: true }),
        supabase.from("townships").select("id, name").order("name", { ascending: true }),
      ]);

      const firstError = applicationResult.error || regionResult.error || townshipResult.error;
      if (firstError) {
        setErrorMessage(firstError.message);
        setApplications([]);
        setRegions([]);
        setTownships([]);
      } else {
        setApplications((applicationResult.data || []) as ApplicationRow[]);
        setRegions((regionResult.data || []) as RegionRow[]);
        setTownships((townshipResult.data || []) as TownshipRow[]);
      }

      setLoading(false);
    };

    fetchApplications();
  }, []);

  const regionNameById = useMemo(
    () => new Map(regions.map((region) => [region.id, region.name])),
    [regions],
  );

  const townshipNameById = useMemo(
    () => new Map(townships.map((township) => [township.id, township.name])),
    [townships],
  );

  const typeOptions = useMemo(
    () => Array.from(new Set(applications.map((application) => application.school_type).filter(Boolean) as string[])).sort(),
    [applications],
  );

  const regionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          applications
            .map((application) => (application.region_id ? regionNameById.get(application.region_id) : null))
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [applications, regionNameById],
  );

  const townshipOptions = useMemo(
    () =>
      Array.from(
        new Set(
          applications
            .map((application) =>
              application.school_township_id ? townshipNameById.get(application.school_township_id) : null,
            )
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [applications, townshipNameById],
  );

  const filteredApplications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return applications.filter((application) => {
      const regionName = application.region_id ? regionNameById.get(application.region_id) : "";
      const townshipName = application.school_township_id
        ? townshipNameById.get(application.school_township_id)
        : "";
      const searchable = [
        application.school_name,
        application.school_type,
        application.full_name_mm,
        application.email,
        application.phone,
        application.status,
        regionName,
        townshipName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesTab = tab === "all" || application.status === tab;
      const matchesType = !typeFilter || application.school_type === typeFilter;
      const matchesRegion = !regionFilter || regionName === regionFilter;
      const matchesTownship = !townshipFilter || townshipName === townshipFilter;

      return matchesSearch && matchesTab && matchesType && matchesRegion && matchesTownship;
    });
  }, [applications, regionNameById, regionFilter, search, tab, townshipFilter, townshipNameById, typeFilter]);

  const statusCounts = useMemo(
    () => ({
      all: applications.length,
      pending: applications.filter((application) => application.status === "pending").length,
      approved: applications.filter((application) => application.status === "approved").length,
      rejected: applications.filter((application) => application.status === "rejected").length,
    }),
    [applications],
  );

  const rows = filteredApplications.map((application) => {
    const regionName = application.region_id ? regionNameById.get(application.region_id) : "";
    const townshipName = application.school_township_id
      ? townshipNameById.get(application.school_township_id)
      : "";

    return [
      <div key="school" className="min-w-0">
        <p className="truncate font-semibold">{application.school_name || "-"}</p>
        <p className="truncate text-xs text-muted-foreground">{application.full_name_mm || "-"}</p>
      </div>,
      application.school_type || "-",
      `${application.grade_from || "-"} → ${application.grade_to || "-"}`,
      regionName || application.region_id || "-",
      townshipName || application.school_township_id || "-",
      formatDate(application.created_at),
      <StatusBadge key="status" status={application.status} />,
      <Link
        key="action"
        to="/super-admin/school-admin-applications"
        className="glass-panel inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:glow-ring"
      >
        <Eye className="h-4 w-4" />
        View
      </Link>,
    ];
  });

  return (
    <>
      <PageHeader
        title="ကျောင်းလျှောက်လွှာများ"
        subtitle="registration_requests table မှ ဝင်ရောက်လာသော ကျောင်းလျှောက်လွှာများ"
      />

      {errorMessage && (
        <div className="glass-panel mb-4 rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <PillTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: `အားလုံး (${statusCounts.all})` },
          { value: "pending", label: `စောင့်ဆိုင်းနေ (${statusCounts.pending})` },
          { value: "approved", label: `အတည်ပြုပြီး (${statusCounts.approved})` },
          { value: "rejected", label: `ငြင်းပယ်ပြီး (${statusCounts.rejected})` },
        ]}
      />

      <FilterBar
        searchPlaceholder="ကျောင်းအမည်၊ applicant၊ email၊ phone ဖြင့်ရှာရန်..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <FilterSelect
          label="ကျောင်းအမျိုးအစား"
          value={typeFilter}
          onChange={setTypeFilter}
          options={typeOptions}
        />
        <FilterSelect
          label="တိုင်း/ပြည်နယ်"
          value={regionFilter}
          onChange={setRegionFilter}
          options={regionOptions}
        />
        <FilterSelect
          label="မြို့နယ်"
          value={townshipFilter}
          onChange={setTownshipFilter}
          options={townshipOptions}
        />
      </FilterBar>

      {loading ? (
        <div className="aqua-card p-10 text-center text-sm text-muted-foreground">
          Loading applications...
        </div>
      ) : (
        <DataTable
          columns={["ကျောင်းအမည်", "အမျိုးအစား", "Grade Range", "တိုင်း/ပြည်နယ်", "မြို့နယ်", "တင်သွင်းရက်", "အခြေအနေ", "Action"]}
          rows={rows}
          emptyIcon={FileText}
          emptyTitle="လျှောက်လွှာမရှိသေးပါ"
          emptyDescription="registration_requests table တွင် matching school application record မရှိပါ။ Search/filter ကိုပြန်စစ်ပါ။"
        />
      )}
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
  return new Intl.DateTimeFormat("my-MM", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
