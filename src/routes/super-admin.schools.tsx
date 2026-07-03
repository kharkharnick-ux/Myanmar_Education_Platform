import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { School } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";
import { FilterBar, FilterSelect } from "@/components/ui-kit/FilterBar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { attachSchoolImageUrls } from "@/lib/school-images";

type SchoolRow = {
  id: string;
  school_name: string;
  school_type: string;
  grade_from: string;
  grade_to: string;
  region_id: number | null;
  township_id: number | null;
  address: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  school_phone: string | null;
  school_email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  logoPreviewUrl?: string;
  coverPreviewUrl?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string | null;
  school_admin_id: string | null;
  school_admin?: { full_name: string | null; email: string | null } | null;
  regions?: { name: string | null } | null;
  townships?: { name: string | null } | null;
};

export const Route = createFileRoute("/super-admin/schools")({
  head: () => ({ meta: [{ title: "ကျောင်းများ စီမံရန် — Admin" }] }),
  component: AdminSchoolsPage,
});

function AdminSchoolsPage() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [townshipFilter, setTownshipFilter] = useState("");

  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("schools")
        .select(
          "id, school_name, school_type, grade_from, grade_to, region_id, township_id, address, owner_name, owner_phone, owner_email, school_phone, school_email, website, logo_url, cover_image_url, status, created_at, school_admin_id, school_admin:profiles!schools_school_admin_id_fkey(full_name, email), regions(name), townships(name)",
        )
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setSchools([]);
      } else {
        const rows = await Promise.all(((data || []) as SchoolRow[]).map((school) => attachSchoolImageUrls(school)));
        setSchools(rows as SchoolRow[]);
      }

      setLoading(false);
    };

    fetchSchools();
  }, []);

  const regionOptions = useMemo(
    () => Array.from(new Set(schools.map((school) => school.regions?.name).filter(Boolean) as string[])).sort(),
    [schools],
  );

  const townshipOptions = useMemo(
    () => Array.from(new Set(schools.map((school) => school.townships?.name).filter(Boolean) as string[])).sort(),
    [schools],
  );

  const filteredSchools = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return schools.filter((school) => {
      const searchable = [
        school.school_name,
        school.school_type,
        school.address,
        school.owner_name,
        school.owner_phone,
        school.owner_email,
        school.school_admin?.full_name,
        school.school_admin?.email,
        school.regions?.name,
        school.townships?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesType = !typeFilter || school.school_type === typeFilter;
      const matchesRegion = !regionFilter || school.regions?.name === regionFilter;
      const matchesTownship = !townshipFilter || school.townships?.name === townshipFilter;

      return matchesSearch && matchesType && matchesRegion && matchesTownship;
    });
  }, [schools, search, typeFilter, regionFilter, townshipFilter]);

  const rows = filteredSchools.map((school) => [
    <div key="name">
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
          <p className="truncate font-semibold">{school.school_name}</p>
          <p className="truncate text-xs text-muted-foreground">{school.owner_name || school.school_admin?.full_name || "-"}</p>
        </div>
      </div>
    </div>,
    school.school_type,
    `${school.grade_from || "-"} → ${school.grade_to || "-"}`,
    school.regions?.name || school.region_id || "-",
    school.townships?.name || school.township_id || "-",
    <StatusBadge key="status" status={school.status} />,
    <div key="contact" className="text-xs text-muted-foreground">
      <p>{school.school_phone || school.owner_phone || "-"}</p>
      <p>{school.school_email || school.owner_email || school.school_admin?.email || "-"}</p>
      {school.website && <p className="truncate">{school.website}</p>}
    </div>,
  ]);

  return (
    <>
      <PageHeader
        title="ကျောင်းများ"
        subtitle="schools table ထဲရှိ ကျောင်းမှတ်တမ်းများကို database မှ တိုက်ရိုက်ဖတ်ထားသည်"
      />

      {errorMessage && (
        <div className="glass-panel mb-4 rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <FilterBar searchPlaceholder="ကျောင်းအမည်၊ admin၊ ဖုန်း၊ email ဖြင့်ရှာရန်..." searchValue={search} onSearchChange={setSearch}>
        <FilterSelect
          label="ကျောင်းအမျိုးအစား"
          value={typeFilter}
          onChange={setTypeFilter}
          options={["private", "public"]}
        />
        <FilterSelect label="တိုင်း/ပြည်နယ်" value={regionFilter} onChange={setRegionFilter} options={regionOptions} />
        <FilterSelect label="မြို့နယ်" value={townshipFilter} onChange={setTownshipFilter} options={townshipOptions} />
      </FilterBar>

      {loading ? (
        <div className="aqua-card p-10 text-center text-sm text-muted-foreground">Loading schools...</div>
      ) : (
        <DataTable
          columns={["ကျောင်းအမည်", "အမျိုးအစား", "Grade Range", "တိုင်း/ပြည်နယ်", "မြို့နယ်", "အခြေအနေ", "ဆက်သွယ်ရန်"]}
          rows={rows}
          emptyIcon={School}
          emptyTitle="ကျောင်းမှတ်တမ်းမရှိသေးပါ"
          emptyDescription="schools table တွင် matching record မရှိပါ။ Search/filter ကိုပြန်စစ်ပါ။"
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
        status === "suspended" && "bg-amber-500/15 text-amber-600 dark:text-amber-300",
      )}
    >
      {status}
    </span>
  );
}
