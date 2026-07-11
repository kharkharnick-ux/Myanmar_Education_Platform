import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Save, School, ShieldCheck, UserRound } from "lucide-react";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { SchoolLogo } from "@/components/principal/SchoolLogo";
import { supabase } from "@/integrations/supabase/client";
import { getPrincipalSettingsData, updatePrincipalProfile } from "@/lib/api/principal-account.functions";

export const Route = createFileRoute("/principal/settings")({
  head: () => ({ meta: [{ title: "ကိုယ်ရေးအချက်အလက် - Principal Dashboard" }] }),
  component: PrincipalSettingsPage,
});

type SettingsData = Awaited<ReturnType<typeof getPrincipalSettingsData>>;

function PrincipalSettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", fullNameEn: "", phone: "", avatarUrl: "", dateOfBirth: "", gender: "", residentialAddress: "", stateRegionId: "", townshipId: "" });

  useEffect(() => { void (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("ကိုယ်ရေးအချက်အလက်ကြည့်ရန် Login ဝင်ပါ။");
      setToken(session.access_token);
      const result = await getPrincipalSettingsData({ data: { accessToken: session.access_token } });
      setData(result);
      setForm({ fullName: result.profile.full_name || "", fullNameEn: result.profile.full_name_en || "", phone: result.profile.phone || "", avatarUrl: result.profile.avatar_url || "", dateOfBirth: result.profile.date_of_birth || "", gender: result.profile.gender || "", residentialAddress: result.profile.residential_address || "", stateRegionId: result.profile.state_region_id ? String(result.profile.state_region_id) : "", townshipId: result.profile.township_id ? String(result.profile.township_id) : "" });
    } catch (e) { setError(e instanceof Error ? e.message : "အချက်အလက်များ ရယူ၍မရပါ။"); } finally { setLoading(false); }
  })(); }, []);

  const townships = useMemo(() => data?.townships.filter((item) => !form.stateRegionId || String(item.region_id) === form.stateRegionId) || [], [data, form.stateRegionId]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage(""); setError("");
    if (!/^[\u1000-\u109F\s.]+$/.test(form.fullName.trim())) return setError("မြန်မာအမည်ကို မြန်မာစာဖြင့်သာ ရေးပါ။");
    if (!/^[A-Za-z\s.'-]+$/.test(form.fullNameEn.trim())) return setError("English name ကို English letters ဖြင့်သာ ရေးပါ။");
    setSaving(true);
    try { await updatePrincipalProfile({ data: { accessToken: token, fullName: form.fullName, fullNameEn: form.fullNameEn, phone: form.phone || null, avatarUrl: form.avatarUrl || null, dateOfBirth: form.dateOfBirth || null, gender: form.gender || null, residentialAddress: form.residentialAddress || null, stateRegionId: form.stateRegionId ? Number(form.stateRegionId) : null, townshipId: form.townshipId ? Number(form.townshipId) : null } }); setMessage("ကိုယ်ရေးအချက်အလက်များကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။"); }
    catch { setError("ကိုယ်ရေးအချက်အလက် သိမ်းရာတွင် ပြဿနာရှိပါသည်။ ပြန်လည်ကြိုးစားပါ။"); } finally { setSaving(false); }
  };

  if (loading) return <main className="aqua-page grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  if (!data) return <main className="aqua-page grid min-h-screen place-items-center p-4"><GlassCard className="rounded-3xl p-8 text-center text-destructive">{error}</GlassCard></main>;
  const school = data.school as Record<string, unknown>;
  const details = [["ကျောင်းအမည်", school.school_name], ["ကျောင်းကုဒ်", school.school_code], ["ကျောင်းအမျိုးအစား", school.school_type], ["ကျောင်းအဆင့်", school.school_level], ["သင်ကြားမည့်အတန်းများ", `${school.grade_from || "-"} မှ ${school.grade_to || "-"}`], ["တိုင်းဒေသကြီး / ပြည်နယ်", (school.regions as { name?: string } | null)?.name], ["မြို့နယ်", (school.townships as { name?: string } | null)?.name], ["လိပ်စာ", school.address], ["ဖုန်းနံပါတ်", school.school_phone], ["Email", school.school_email], ["Website", school.website], ["စတင်တည်ထောင်သည့်နှစ်", school.established_year], ["ကျောင်းသားဦးရေ", school.student_count], ["ဆရာ/ဆရာမဦးရေ", school.teacher_count], ["စာရွက်စာတမ်းအခြေအနေ", school.document_url ? "တင်ထားပြီး" : "မရှိသေးပါ"]];

  return <main className="aqua-page min-h-screen p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-6xl space-y-6"><Link to="/principal/dashboard" className="glass-panel inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold"><ArrowLeft className="h-4 w-4" />ပင်မစာမျက်နှာ</Link><div><h1 className="text-3xl font-bold">ကိုယ်ရေးအချက်အလက်</h1><p className="mt-2 text-sm text-muted-foreground">Principal ကိုယ်ရေးအချက်အလက်ကို ပြင်ဆင်နိုင်ပြီး တာဝန်ယူထားသော ကျောင်းအချက်အလက်ကို ကြည့်ရှုနိုင်ပါသည်။</p></div><GlassCard className="rounded-[2rem] p-6"><div className="flex items-center gap-3"><UserRound className="h-6 w-6 text-primary" /><h2 className="text-xl font-bold">Principal ကိုယ်ရေးအချက်အလက်</h2></div><form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">{[["မြန်မာအမည်", "fullName"], ["English အမည်", "fullNameEn"], ["ဖုန်းနံပါတ်", "phone"], ["မွေးနေ့", "dateOfBirth"], ["လိင်", "gender"], ["ကိုယ်ရေးပုံ URL", "avatarUrl"]].map(([label, key]) => <label key={key} className="space-y-2 text-sm font-semibold">{label}<input type={key === "dateOfBirth" ? "date" : "text"} value={form[key as keyof typeof form]} onChange={(e) => update(key as keyof typeof form, e.target.value)} className="aqua-input block w-full rounded-xl px-4 py-3" /></label>)}<label className="space-y-2 text-sm font-semibold sm:col-span-2">နေရပ်လိပ်စာ<textarea value={form.residentialAddress} onChange={(e) => update("residentialAddress", e.target.value)} className="aqua-input block min-h-24 w-full rounded-xl px-4 py-3" /></label><label className="space-y-2 text-sm font-semibold">တိုင်းဒေသကြီး / ပြည်နယ်<select value={form.stateRegionId} onChange={(e) => { update("stateRegionId", e.target.value); update("townshipId", ""); }} className="aqua-input block w-full rounded-xl px-4 py-3"><option value="">ရွေးချယ်ပါ</option>{data.regions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="space-y-2 text-sm font-semibold">မြို့နယ်<select value={form.townshipId} onChange={(e) => update("townshipId", e.target.value)} className="aqua-input block w-full rounded-xl px-4 py-3"><option value="">ရွေးချယ်ပါ</option>{townships.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="glass-panel rounded-xl p-3 text-sm">Email: {data.profile.email} · Role: {data.profile.role} · Status: {data.profile.status}</div><div className="flex items-center justify-end"><button disabled={saving} className="aqua-button inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}ကိုယ်ရေးအချက်အလက် သိမ်းမည်</button></div>{message && <p className="text-sm text-emerald-600 sm:col-span-2">{message}</p>}{error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}</form></GlassCard><GlassCard className="rounded-[2rem] p-6"><div className="flex items-center gap-4"><SchoolLogo path={String(school.logo_url || "")} schoolName={String(school.school_name || "ကျောင်း")} className="h-16 w-16" iconClassName="h-7 w-7" /><div><h2 className="text-xl font-bold">တာဝန်ယူထားသော ကျောင်းအချက်အလက်</h2><p className="mt-1 text-sm text-muted-foreground">{String(school.school_name || "-")}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{details.map(([label, value]) => <div key={String(label)} className="glass-panel rounded-2xl p-4"><p className="text-xs text-muted-foreground">{String(label)}</p><p className="mt-2 font-bold">{String(value ?? "-")}</p></div>)}</div><div className="mt-5 flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" /><p>School Profile ကို School Admin မှသာ ပြင်ဆင်နိုင်ပါသည်။ Principal သည် မိမိကိုယ်ရေးအချက်အလက်ကိုသာ ပြင်ဆင်နိုင်ပြီး ကျောင်းအချက်အလက်များကို ကြည့်ရှုရန်သာ ခွင့်ပြုထားပါသည်။</p></div></GlassCard></div></main>;
}
