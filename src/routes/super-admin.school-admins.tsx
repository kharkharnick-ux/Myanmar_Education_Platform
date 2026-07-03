import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { DataTable } from "@/components/ui-kit/DataTable";
import { FilterBar, FilterSelect } from "@/components/ui-kit/FilterBar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ProfileRow = {
  id: string;
  full_name: string;
  full_name_en: string | null;
  email: string;
  phone: string | null;
  status: "active" | "inactive" | "suspended";
  last_login_at: string | null;
  created_at: string | null;
};

type SchoolRow = {
  id: string;
  school_name: string;
  status: string;
  school_admin_id: string | null;
};

export const Route = createFileRoute("/super-admin/school-admins")({
  head: () => ({ meta: [{ title: "ကျောင်း Admin များ — Admin" }] }),
  component: AdminsPage,
});

function AdminsPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");

  useEffect(() => {
    const fetchAdmins = async () => {
      setLoading(true);
      setErrorMessage("");

      const [profileResult, schoolResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, full_name_en, email, phone, status, last_login_at, created_at")
          .eq("role", "school_admin")
          .order("created_at", { ascending: false }),
        supabase
          .from("schools")
          .select("id, school_name, status, school_admin_id")
          .not("school_admin_id", "is", null),
      ]);

      const firstError = profileResult.error || schoolResult.error;
      if (firstError) {
        setErrorMessage(firstError.message);
        setProfiles([]);
        setSchools([]);
      } else {
        setProfiles((profileResult.data || []) as ProfileRow[]);
        setSchools((schoolResult.data || []) as SchoolRow[]);
      }

      setLoading(false);
    };

    fetchAdmins();
  }, []);

  const schoolByAdminId = useMemo(() => {
    const map = new Map<string, SchoolRow>();
    for (const school of schools) {
      if (school.school_admin_id) map.set(school.school_admin_id, school);
    }
    return map;
  }, [schools]);

  const schoolOptions = useMemo(
    () => Array.from(new Set(schools.map((school) => school.school_name).filter(Boolean))).sort(),
    [schools],
  );

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return profiles.filter((profile) => {
      const school = schoolByAdminId.get(profile.id);
      const searchable = [
        profile.full_name,
        profile.full_name_en,
        profile.email,
        profile.phone,
        profile.status,
        school?.school_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesStatus = !statusFilter || profile.status === statusFilter;
      const matchesSchool = !schoolFilter || school?.school_name === schoolFilter;

      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [profiles, schoolByAdminId, schoolFilter, search, statusFilter]);

  const rows = filteredProfiles.map((profile) => {
    const school = schoolByAdminId.get(profile.id);

    return [
      <div key="name">
        <p className="font-semibold">{profile.full_name}</p>
        <p className="text-xs text-muted-foreground">{profile.full_name_en || "-"}</p>
      </div>,
      profile.email,
      profile.phone || "-",
      school?.school_name || "-",
      formatDate(profile.last_login_at),
      <StatusBadge key="status" status={profile.status} />,
    ];
  });

  return (
    <>
      <PageHeader
        title="ကျောင်း Admin များ"
        subtitle="profiles table ထဲရှိ active/approved school_admin account များ"
      />

      {errorMessage && (
        <div className="glass-panel mb-4 rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <FilterBar searchPlaceholder="အမည်၊ email၊ ဖုန်း၊ ကျောင်းအမည်ဖြင့်ရှာရန်..." searchValue={search} onSearchChange={setSearch}>
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={["active", "inactive", "suspended"]}
        />
        <FilterSelect label="ကျောင်း" value={schoolFilter} onChange={setSchoolFilter} options={schoolOptions} />
      </FilterBar>

      {loading ? (
        <div className="aqua-card p-10 text-center text-sm text-muted-foreground">Loading school admins...</div>
      ) : (
        <DataTable
          columns={["အမည်", "Email", "Phone", "တာဝန်ပေးထားသည့်ကျောင်း", "Last Login", "Status"]}
          rows={rows}
          emptyIcon={UserCog}
          emptyTitle="Admin မှတ်တမ်းမရှိသေးပါ"
          emptyDescription="profiles table တွင် matching school_admin account မရှိပါ။"
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
        status === "active" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
        status === "inactive" && "bg-muted text-muted-foreground",
        status === "suspended" && "bg-destructive/15 text-destructive",
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
