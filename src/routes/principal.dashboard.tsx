import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Clock3,
  FileText, GraduationCap, LayoutDashboard, Loader2, LogIn, LogOut, Menu, Plus,
  School, Settings, ShieldCheck, UserCheck, Users, X, XCircle,
} from "lucide-react";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { SchoolLogo } from "@/components/principal/SchoolLogo";
import { supabase } from "@/integrations/supabase/client";
import { getPrincipalDashboardAccess } from "@/lib/api/principal-account.functions";

type AccessState =
  | { status: "loading" | "signed-out" }
  | { status: "error" | "pending" | "setup_pending" | "rejected"; message: string }
  | {
      status: "approved";
      profile: { id: string; fullName: string; email: string; avatarUrl?: string | null };
      school: { id: string; name: string; type: string | null; gradeFrom: string | null; gradeTo: string | null; logoUrl?: string | null };
    };

type MenuKey = "dashboard" | "teachers" | "classes" | "capacity" | "students" | "leave" | "announcements" | "events" | "reports" | "documents" | "settings";
type CapacityRow = { id: string; grade_code: string; capacity_limit: number; admission_status: "open" | "closed"; manually_closed: boolean; auto_closed: boolean };
type AcademicYear = { id: string; name: string };

const orderedGradeLabels = [
  "KG", "G-1", "G-2", "G-3", "G-4", "G-5", "G-6",
  "G-7", "G-8", "G-9", "G-10", "G-11", "G-12",
] as const;

const normalizeGradeLabel = (value: string | null) => {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "") || "";
  if (normalized === "KG" || normalized === "K") return "KG";
  const match = normalized.match(/^(?:G|GRADE)-?(\d{1,2})$/);
  if (!match) return null;
  const gradeNumber = Number(match[1]);
  return gradeNumber >= 1 && gradeNumber <= 12 ? `G-${gradeNumber}` : null;
};

const getGradesInSchoolRange = (gradeFrom: string | null, gradeTo: string | null) => {
  const normalizedFrom = normalizeGradeLabel(gradeFrom);
  const normalizedTo = normalizeGradeLabel(gradeTo);
  if (!normalizedFrom || !normalizedTo) return [];
  const fromIndex = orderedGradeLabels.indexOf(normalizedFrom as (typeof orderedGradeLabels)[number]);
  const toIndex = orderedGradeLabels.indexOf(normalizedTo as (typeof orderedGradeLabels)[number]);
  if (fromIndex < 0 || toIndex < 0 || fromIndex > toIndex) return [];
  return orderedGradeLabels.slice(fromIndex, toIndex + 1);
};

const menuItems: Array<{ key: MenuKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "dashboard", label: "ပင်မစာမျက်နှာ", icon: LayoutDashboard },
  { key: "teachers", label: "ဆရာ/ဆရာမ စီမံခန့်ခွဲမှု", icon: Users },
  { key: "classes", label: "အတန်း စီမံခန့်ခွဲမှု", icon: BookOpen },
  { key: "capacity", label: "ကျောင်းသားလက်ခံဦးရေ", icon: GraduationCap },
  { key: "students", label: "ကျောင်းသားအချက်အလက်များ", icon: UserCheck },
  { key: "leave", label: "ခွင့်တောင်းခံမှုများ", icon: ClipboardList },
  { key: "announcements", label: "ကြေညာချက်များ", icon: Bell },
  { key: "events", label: "ကျောင်းပွဲများ / ပိတ်ရက်များ", icon: CalendarDays },
  { key: "reports", label: "အစီရင်ခံစာများ", icon: BarChart3 },
  { key: "documents", label: "စာရွက်စာတမ်းများ", icon: FileText },
  { key: "settings", label: "ကိုယ်ရေးအချက်အလက်", icon: Settings },
];

export const Route = createFileRoute("/principal/dashboard")({
  head: () => ({ meta: [{ title: "Principal Dashboard - Myanmar Education Platform" }] }),
  component: PrincipalDashboardRoute,
});

function PrincipalDashboardRoute() {
  const navigate = useNavigate();
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const [activeMenu, setActiveMenu] = useState<MenuKey>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session?.access_token) return mounted && setAccess({ status: "signed-out" });
        const result = await getPrincipalDashboardAccess({ data: { accessToken: session.access_token } });
        if (!mounted) return;
        if (result.status === "approved") {
          setAccess({ status: "approved", profile: result.profile, school: result.school });
        } else if (result.status === "rejected" || result.status === "pending" || result.status === "setup_pending") {
          setAccess({ status: result.status, message: result.message });
        } else setAccess({ status: "error", message: "Principal account information was not found." });
      } catch (error) {
        if (mounted) setAccess({ status: "error", message: error instanceof Error ? error.message : "Unable to open Principal dashboard." });
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (access.status !== "approved") return <AccessGate state={access} />;
  const current = menuItems.find((item) => item.key === activeMenu) || menuItems[0];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="aqua-page min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      {mobileOpen && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-border/60 bg-background/95 p-4 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between rounded-2xl p-3">
          <Link to="/principal/settings" className="flex min-w-0 items-center gap-3"><SchoolLogo path={access.school.logoUrl} schoolName={access.school.name} className="h-11 w-11" /><div className="min-w-0"><p className="max-w-40 truncate font-bold">{access.school.name}</p><p className="text-xs text-muted-foreground">Principal Dashboard</p><p className="max-w-40 truncate text-[11px] text-muted-foreground">{access.profile.fullName}</p></div></Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
          {menuItems.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => { setActiveMenu(key); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeMenu === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}
        </nav>
        <button onClick={signOut} className="glass-panel mt-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"><LogOut className="h-4 w-4" />ထွက်ရန်</button>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><button className="glass-panel grid h-11 w-11 place-items-center rounded-2xl lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{access.school.name}</p><h1 className="text-2xl font-bold sm:text-3xl">{current.label}</h1></div></div><Link to="/principal/settings" className="glass-panel hidden items-center gap-3 rounded-2xl px-3 py-2 sm:flex">{access.profile.avatarUrl ? <img src={access.profile.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <UserCheck className="h-6 w-6 text-primary" />}<div className="text-right"><p className="font-bold">{access.profile.fullName}</p><p className="text-xs text-muted-foreground">{access.profile.email}</p></div></Link></header>
        {activeMenu === "dashboard" ? <Overview schoolId={access.school.id} onNavigate={setActiveMenu} /> : activeMenu === "capacity" ? <CapacityPage access={access} /> : activeMenu === "settings" ? <div className="text-center"><Link to="/principal/settings" className="aqua-button inline-flex rounded-2xl px-5 py-3 font-bold">ကိုယ်ရေးအချက်အလက် ကြည့်ရန်</Link></div> : <Placeholder title={current.label} icon={current.icon} />}
      </main>
    </div>
  );
}

function Overview({ schoolId, onNavigate }: { schoolId: string; onNavigate: (key: MenuKey) => void }) {
  const [counts, setCounts] = useState([0, 0, 0, 0, 0, 0]);
  useEffect(() => { void (async () => {
    const queries = [
      supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      supabase.from("registration_requests").select("id", { count: "exact", head: true }).eq("request_type", "teacher").eq("approved_school_id", schoolId).eq("status", "pending"),
      supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      supabase.from("teacher_leave_requests").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "pending"),
      supabase.from("announcements").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    ];
    const results = await Promise.allSettled(queries);
    setCounts(results.map((result) => result.status === "fulfilled" ? result.value.count || 0 : 0));
  })(); }, [schoolId]);
  const cards = [["ဆရာ/ဆရာမ စုစုပေါင်း", counts[0], Users], ["စစ်ဆေးရန် ဆရာ/ဆရာမ လျှောက်လွှာများ", counts[1], Clock3], ["အတန်း စုစုပေါင်း", counts[2], BookOpen], ["ကျောင်းသား စုစုပေါင်း", counts[3], GraduationCap], ["စစ်ဆေးရန် ခွင့်တောင်းခံမှုများ", counts[4], ClipboardList], ["လက်ရှိကြေညာချက်များ", counts[5], Bell]] as const;
  return <div className="space-y-6"><p className="text-sm text-muted-foreground">ဆရာ/ဆရာမများ၊ အတန်းများ၊ ကျောင်းသားအချက်အလက်များနှင့် ကျောင်းလုပ်ငန်းများကို စီမံခန့်ခွဲနိုင်ပါသည်။</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, Icon]) => <GlassCard key={label} className="rounded-[1.75rem] p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div><div className="theme-icon-tile h-12 w-12 rounded-2xl"><Icon className="h-5 w-5" /></div></div></GlassCard>)}</div><GlassCard className="rounded-[2rem] p-6"><h2 className="text-lg font-bold">လျင်မြန်စွာ လုပ်ဆောင်ရန်</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[["ဆရာ/ဆရာမ ဖိတ်ကြားရန်", "teachers"], ["လျှောက်လွှာ စစ်ဆေးရန်", "teachers"], ["အတန်းပိုင်ဆရာ သတ်မှတ်ရန်", "classes"], ["ကြေညာချက်တင်ရန်", "announcements"], ["ပိတ်ရက် / ပွဲတော် ထည့်ရန်", "events"], ["လက်ခံဦးရေ သတ်မှတ်ရန်", "capacity"]].map(([label, key]) => <button key={label} onClick={() => onNavigate(key as MenuKey)} className="glass-panel flex items-center gap-3 rounded-2xl p-4 text-left text-sm font-semibold transition hover:glow-ring"><Plus className="h-4 w-4 text-primary" />{label}</button>)}</div></GlassCard></div>;
}

function CapacityPage({ access }: { access: Extract<AccessState, { status: "approved" }> }) {
  const [years, setYears] = useState<AcademicYear[]>([]); const [yearId, setYearId] = useState(""); const [rows, setRows] = useState<CapacityRow[]>([]); const [saving, setSaving] = useState("");
  const grades = useMemo(
    () => getGradesInSchoolRange(access.school.gradeFrom, access.school.gradeTo),
    [access.school.gradeFrom, access.school.gradeTo],
  );
  const load = async (selected = yearId) => { if (!selected) return; const { data } = await supabase.from("school_grade_admission_capacity").select("id, grade_code, capacity_limit, admission_status, manually_closed, auto_closed").eq("school_id", access.school.id).eq("academic_year_id", selected); setRows((data || []) as CapacityRow[]); };
  useEffect(() => { void (async () => { const { data } = await supabase.from("academic_years").select("id, name").order("name", { ascending: false }); const list = (data || []) as AcademicYear[]; setYears(list); if (list[0]) { setYearId(list[0].id); await load(list[0].id); } })(); }, []);
  const save = async (grade: string, limit: number, close?: boolean) => { if (!yearId) return; setSaving(grade); const existing = rows.find((row) => row.grade_code === grade); const manuallyClosed = close ?? existing?.manually_closed ?? false; await supabase.from("school_grade_admission_capacity").upsert({ school_id: access.school.id, academic_year_id: yearId, grade_code: grade, capacity_limit: Math.max(0, limit), admission_status: manuallyClosed ? "closed" : "open", manually_closed: manuallyClosed, auto_closed: false, created_by: access.profile.id, updated_by: access.profile.id, updated_at: new Date().toISOString() }, { onConflict: "school_id,academic_year_id,grade_code" }); await load(); setSaving(""); };
  if (access.school.type !== "private") return <GlassCard className="rounded-[2rem] p-8 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-4 text-xl font-bold">Admissions / Capacity</h2><p className="mt-2 text-muted-foreground">Public school အတွက် capacity control ကို မသတ်မှတ်ထားပါ။</p></GlassCard>;
  return <GlassCard className="rounded-[2rem] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold">Grade admission capacity</h2><p className="mt-1 text-sm text-muted-foreground">Set private-school limits for {access.school.gradeFrom || "-"} to {access.school.gradeTo || "-"} by academic year.</p></div><label className="text-sm font-semibold">Academic year<select value={yearId} onChange={(e) => { setYearId(e.target.value); void load(e.target.value); }} className="aqua-input mt-2 block rounded-xl px-3 py-2">{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label></div>{grades.length === 0 ? <div className="glass-panel mt-6 rounded-2xl p-6 text-center text-sm text-muted-foreground">This school does not have a valid grade range configured.</div> : <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border/60 text-left text-muted-foreground"><th className="p-3">Grade</th><th className="p-3">Capacity</th><th className="p-3">Accepted</th><th className="p-3">Remaining</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{grades.map((grade) => { const row = rows.find((item) => normalizeGradeLabel(item.grade_code) === grade); const limit = row?.capacity_limit || 0; return <CapacityLine key={grade} grade={grade} limit={limit} row={row} saving={saving === grade} onSave={save} />; })}</tbody></table></div>}<p className="mt-4 text-xs text-muted-foreground">Accepted counts remain 0 until the admission application table/status mapping is connected.</p></GlassCard>;
}

function CapacityLine({ grade, limit, row, saving, onSave }: { grade: string; limit: number; row?: CapacityRow; saving: boolean; onSave: (grade: string, limit: number, close?: boolean) => void }) { const [value, setValue] = useState(String(limit)); useEffect(() => setValue(String(limit)), [limit]); const closed = row?.admission_status === "closed"; return <tr className="border-b border-border/40"><td className="p-3 font-bold">{grade}</td><td className="p-3"><input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="aqua-input w-24 rounded-xl px-3 py-2" /></td><td className="p-3">0</td><td className="p-3">{Math.max(0, Number(value) || 0)}</td><td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${closed ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"}`}>{closed ? "Closed" : "Open"}</span></td><td className="p-3"><div className="flex gap-2"><button disabled={saving} onClick={() => onSave(grade, Number(value) || 0)} className="aqua-button rounded-xl px-3 py-2 text-xs font-bold">{saving ? "Saving..." : "Save"}</button><button disabled={saving} onClick={() => onSave(grade, Number(value) || 0, !closed)} className="glass-panel rounded-xl px-3 py-2 text-xs font-bold">{closed ? "Open" : "Close"}</button></div></td></tr>; }

function Placeholder({ title, icon: Icon }: { title: string; icon: ComponentType<{ className?: string }> }) { return <GlassCard className="rounded-[2rem] p-10 text-center"><div className="theme-icon-tile-strong mx-auto h-16 w-16 rounded-3xl"><Icon className="h-7 w-7" /></div><h2 className="mt-5 text-2xl font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">ဆက်လက်တည်ဆောက်နေပါသည်။</p></GlassCard>; }

function AccessGate({ state }: { state: Exclude<AccessState, { status: "approved" }> }) { let icon: ReactNode = <ShieldCheck className="h-9 w-9" />; let title = "Principal Dashboard"; let message = "Checking Principal account..."; if (state.status === "loading") icon = <Loader2 className="h-9 w-9 animate-spin" />; if (state.status === "signed-out") { icon = <LogIn className="h-9 w-9" />; title = "Login required"; message = "Please login to use the Principal dashboard."; } else if (state.status !== "loading") { message = state.message; icon = state.status === "rejected" ? <XCircle className="h-9 w-9" /> : state.status === "pending" || state.status === "setup_pending" ? <Clock3 className="h-9 w-9" /> : icon; } return <main className="aqua-page grid min-h-screen place-items-center p-4"><GlassCard className="w-full max-w-xl rounded-[2rem] p-8 text-center"><div className="theme-icon-tile-strong mx-auto h-16 w-16 rounded-3xl">{icon}</div><h1 className="mt-4 text-2xl font-bold">{title}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>{state.status === "signed-out" && <Link to="/auth" className="aqua-button mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-bold">Login</Link>}</GlassCard></main>; }
