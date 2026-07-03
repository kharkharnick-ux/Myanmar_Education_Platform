import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Download,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Lock,
  LogOut,
  Megaphone,
  Moon,
  PieChart,
  School,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Trash2,
  Upload,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ProfileDrawer } from "./ProfileDrawer";

export type SchoolAdminAccess = {
  status: "approved";
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    avatar_url: string | null;
  };
  school: {
    id: string;
    school_name: string;
    school_type: string;
    grade_from: string;
    grade_to: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    region_name: string | null;
    township_name: string | null;
    document_url: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
  };
};

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { to: "/school-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/school-admin/school-profile", label: "School Profile", icon: School },
  { to: "/school-admin/principal-management", label: "Principal Management", icon: UserCog },
  { to: "/school-admin/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/school-admin/academic", label: "Academic", icon: BookOpen },
  { to: "/school-admin/report-cards", label: "Report Cards", icon: FileText },
  { to: "/school-admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/school-admin/instructions", label: "Instructions", icon: Megaphone },
  { to: "/school-admin/documents", label: "Documents", icon: Download },
  { to: "/school-admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/school-admin/settings", label: "Settings", icon: Settings },
];

const metricCards = [
  { label: "Total Students", icon: Users },
  { label: "Total Teachers", icon: GraduationCap },
  { label: "Total Classes", icon: School },
  { label: "Today's Attendance", icon: ClipboardCheck },
  { label: "Absent Students", icon: UserCheck },
  { label: "Pending Principal Requests", icon: UserCog },
];

const SCHOOL_IMAGE_BUCKET = "application-school-logos";
const PROFILE_AVATAR_BUCKET = "avatars";

const getEmailUsername = (email: string) => email.split("@")[0] || email;

const getProfileDisplayName = (profile: SchoolAdminAccess["profile"]) =>
  profile.full_name?.trim() || getEmailUsername(profile.email);

const getInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "A";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : trimmed.slice(0, 2);
  return initials.toUpperCase();
};

const getSchoolImageExtension = (file: File) => {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "";
};

const validateSchoolImageFile = (file: File, label: string) => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error(`${label} ကို PNG, JPG, WEBP image file သာ ရွေးချယ်နိုင်ပါသည်။`);
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(`${label} file size သည် 5 MB ထက် မကျော်ရပါ။`);
  }
};

function useSchoolImagePreview(path?: string | null) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    let active = true;

    const fetchPreview = async () => {
      if (!path) {
        setPreviewUrl("");
        return;
      }

      const { data, error } = await supabase.storage
        .from(SCHOOL_IMAGE_BUCKET)
        .createSignedUrl(path, 60 * 60);

      if (!active) return;

      if (error || !data?.signedUrl) {
        setPreviewUrl("");
        return;
      }

      const separator = data.signedUrl.includes("?") ? "&" : "?";
      setPreviewUrl(`${data.signedUrl}${separator}v=${Date.now()}`);
    };

    fetchPreview();

    return () => {
      active = false;
    };
  }, [path]);

  return previewUrl;
}

function useProfileAvatarPreview(path?: string | null) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    let active = true;

    const fetchPreview = async () => {
      if (!path) {
        setPreviewUrl("");
        return;
      }

      if (/^(https?:|data:|blob:)/.test(path)) {
        setPreviewUrl(path);
        return;
      }

      const { data, error } = await supabase.storage
        .from(PROFILE_AVATAR_BUCKET)
        .createSignedUrl(path, 60 * 60);

      if (!active) return;

      if (error || !data?.signedUrl) {
        setPreviewUrl("");
        return;
      }

      const separator = data.signedUrl.includes("?") ? "&" : "?";
      setPreviewUrl(`${data.signedUrl}${separator}v=${Date.now()}`);
    };

    fetchPreview();

    return () => {
      active = false;
    };
  }, [path]);

  return previewUrl;
}

type SchoolAdminContextValue = SchoolAdminAccess & {
  updateProfile: (profile: Partial<SchoolAdminAccess["profile"]>) => void;
  updateSchool: (school: Partial<SchoolAdminAccess["school"]>) => void;
};

const SchoolAdminContext = createContext<SchoolAdminContextValue | null>(null);

export function SchoolAdminDashboardProvider({
  access,
  children,
}: {
  access: SchoolAdminAccess;
  children: ReactNode;
}) {
  const [currentAccess, setCurrentAccess] = useState(access);

  useEffect(() => {
    setCurrentAccess(access);
  }, [access]);

  const updateSchool = (school: Partial<SchoolAdminAccess["school"]>) => {
    setCurrentAccess((current) => ({
      ...current,
      school: {
        ...current.school,
        ...school,
      },
    }));
  };

  const updateProfile = (profile: Partial<SchoolAdminAccess["profile"]>) => {
    setCurrentAccess((current) => ({
      ...current,
      profile: {
        ...current.profile,
        ...profile,
      },
    }));
  };

  return (
    <SchoolAdminContext.Provider value={{ ...currentAccess, updateProfile, updateSchool }}>
      {children}
    </SchoolAdminContext.Provider>
  );
}

export function useSchoolAdminAccess() {
  const access = useContext(SchoolAdminContext);
  if (!access) throw new Error("useSchoolAdminAccess must be used inside SchoolAdminDashboardProvider.");
  return access;
}

export function SchoolAdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="aqua-page min-h-screen">
      <div className="flex min-h-screen">
        <SchoolAdminSidebar />
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <SchoolAdminHeader />
          {children}
        </div>
      </div>
    </main>
  );
}

function SchoolAdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const access = useSchoolAdminAccess();
  const { theme, mounted, toggle } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileName = getProfileDisplayName(access.profile);
  const profileAvatarUrl = useProfileAvatarPreview(access.profile.avatar_url);
  const profileInitials = getInitials(profileName || access.profile.email);

  const refreshProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email, phone, role, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) return;

    access.updateProfile({
      full_name: data.full_name || user.email?.split("@")[0] || "",
      email: data.email,
      phone: data.phone,
      role: data.role,
      avatar_url: data.avatar_url,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-4 p-4 lg:flex">
      <div className="aqua-card p-3">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent/35"
        >
          <div className="theme-icon-tile-strong h-10 w-10 shrink-0 overflow-hidden rounded-full text-xs font-bold shadow-inner">
            {profileAvatarUrl ? (
              <img src={profileAvatarUrl} alt="School admin avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{profileInitials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{profileName}</div>
            <div className="truncate text-[11px] text-muted-foreground">{access.profile.email}</div>
          </div>
        </button>
      </div>

      <ProfileDrawer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onProfileUpdated={refreshProfile}
        user={{
          full_name: profileName,
          email: access.profile.email,
          phone: access.profile.phone,
          role: access.profile.role,
          avatar_url: access.profile.avatar_url,
        }}
      />

      <nav className="aqua-panel flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                    active
                      ? "theme-active-surface"
                      : "text-muted-foreground hover:bg-accent/35 hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                      active && "text-primary",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="aqua-card space-y-3 p-3">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="theme-icon-tile-strong relative h-10 w-10 rounded-xl">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold glow-text">Myanmar EDU</div>
            <div className="truncate text-[10px] uppercase tracking-tight text-muted-foreground">School Admin ERP</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggle}
            className="glass-panel flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs transition-all hover:glow-ring"
            aria-label="Toggle theme"
          >
            {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <div className="h-4 w-4" />}
            <span>{mounted ? (theme === "dark" ? "Light" : "Dark") : "Theme"}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="glass-panel flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-destructive transition-all hover:glow-ring"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function SchoolAdminHeader() {
  const access = useSchoolAdminAccess();
  const userInitial = useMemo(() => access.profile.full_name.trim().charAt(0) || "A", [access.profile.full_name]);
  const schoolLogoUrl = useSchoolImagePreview(access.school.logo_url);

  return (
    <header className="aqua-panel gloss-highlight sticky top-4 z-20 mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="theme-icon-tile-strong h-12 w-12 shrink-0 overflow-hidden rounded-2xl">
          {schoolLogoUrl ? (
            <img src={schoolLogoUrl} alt="School logo" className="h-full w-full object-cover" />
          ) : (
            <School className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{access.school.school_name}</p>
          <p className="text-xs text-muted-foreground">
            {access.school.school_type} • {access.school.grade_from} to {access.school.grade_to}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="aqua-input h-10 rounded-xl px-3 text-sm" disabled>
          <option>Academic year not configured</option>
        </select>
        <IconButton label="Notifications" icon={Bell} disabled />
        <Link
          to="/school-admin/settings"
          aria-label="Settings"
          className="glass-panel inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:glow-ring"
        >
          <Settings className="h-4 w-4" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-sm font-bold text-primary">
          {userInitial}
        </div>
      </div>
    </header>
  );
}

export function SchoolAdminDashboardOverview() {
  const access = useSchoolAdminAccess();

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={`${access.school.school_name} အတွက် overview widgets များ။ Real backend data မရှိသေးသောနေရာများတွင် empty state ပြထားသည်။`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <MetricEmptyCard key={metric.label} icon={metric.icon} label={metric.label} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ManagementEmptyCard icon={UserCog} title="Pending Principal Requests" />
        <ManagementEmptyCard icon={Bell} title="Recent Notifications" />
        <GlassCard className="rounded-[2rem] p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={TrendingUp} title="School Performance Score" />
            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
              Waiting for backend data
            </span>
          </div>
          <EmptyState
            icon={Activity}
            title="No performance data available"
            description="Attendance, academic, teacher ratio, reports, and school health will appear after backend integration."
          />
        </GlassCard>
      </div>
    </div>
  );
}

export function SchoolProfilePage() {
  const access = useSchoolAdminAccess();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    schoolName: access.school.school_name || "",
    phone: access.school.phone || "",
    email: access.school.email || "",
    address: access.school.address || "",
  });
  const [savedProfile, setSavedProfile] = useState({
    schoolName: access.school.school_name || "",
    phone: access.school.phone || "",
    email: access.school.email || "",
    address: access.school.address || "",
    logoPath: access.school.logo_url || null,
    coverPath: access.school.cover_image_url || null,
  });
  const [logoPath, setLogoPath] = useState<string | null>(access.school.logo_url || null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoMarkedForRemoval, setLogoMarkedForRemoval] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverPath, setCoverPath] = useState<string | null>(access.school.cover_image_url || null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverMarkedForRemoval, setCoverMarkedForRemoval] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const fetchLogoPath = async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("logo_url")
        .eq("id", access.school.id)
        .maybeSingle();

      if (!active) return;
      if (!error && data && "logo_url" in data) {
        const latestLogoPath = (data as { logo_url?: string | null }).logo_url || null;
        setLogoPath(latestLogoPath);
        setSavedProfile((current) => ({ ...current, logoPath: latestLogoPath }));
      }
    };

    fetchLogoPath();

    return () => {
      active = false;
    };
  }, [access.school.id]);

  useEffect(() => {
    let active = true;

    const fetchCoverPath = async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("cover_image_url")
        .eq("id", access.school.id)
        .maybeSingle();

      if (!active) return;
      if (!error && data && "cover_image_url" in data) {
        const latestCoverPath = (data as { cover_image_url?: string | null }).cover_image_url || null;
        setCoverPath(latestCoverPath);
        setSavedProfile((current) => ({ ...current, coverPath: latestCoverPath }));
      }
    };

    fetchCoverPath();

    return () => {
      active = false;
    };
  }, [access.school.id]);

  useEffect(() => {
    let active = true;

    const fetchLogoPreview = async () => {
      if (logoFile || logoMarkedForRemoval) return;

      if (!logoPath) {
        setLogoPreviewUrl("");
        return;
      }

      const { data, error } = await supabase.storage
        .from(SCHOOL_IMAGE_BUCKET)
        .createSignedUrl(logoPath, 60 * 60);

      if (!active) return;
      setLogoPreviewUrl(error || !data?.signedUrl ? "" : data.signedUrl);
    };

    fetchLogoPreview();

    return () => {
      active = false;
    };
  }, [logoPath, logoFile, logoMarkedForRemoval]);

  useEffect(() => {
    let active = true;

    const fetchCoverPreview = async () => {
      if (coverFile || coverMarkedForRemoval) return;

      if (!coverPath) {
        setCoverPreviewUrl("");
        return;
      }

      const { data, error } = await supabase.storage
        .from(SCHOOL_IMAGE_BUCKET)
        .createSignedUrl(coverPath, 60 * 60);

      if (!active) return;
      setCoverPreviewUrl(error || !data?.signedUrl ? "" : data.signedUrl);
    };

    fetchCoverPreview();

    return () => {
      active = false;
    };
  }, [coverPath, coverFile, coverMarkedForRemoval]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const hasProfileChanges = useMemo(() => {
    const textChanged =
      form.schoolName.trim() !== savedProfile.schoolName.trim() ||
      form.phone.trim() !== savedProfile.phone.trim() ||
      form.email.trim() !== savedProfile.email.trim() ||
      form.address.trim() !== savedProfile.address.trim();

    const logoChanged =
      Boolean(logoFile) ||
      (logoMarkedForRemoval && Boolean(savedProfile.logoPath)) ||
      logoPath !== savedProfile.logoPath;

    const coverChanged =
      Boolean(coverFile) ||
      (coverMarkedForRemoval && Boolean(savedProfile.coverPath)) ||
      coverPath !== savedProfile.coverPath;

    return textChanged || logoChanged || coverChanged;
  }, [coverFile, coverMarkedForRemoval, coverPath, form, logoFile, logoMarkedForRemoval, logoPath, savedProfile]);

  const uploadSchoolImage = async (file: File, kind: "logo" | "cover") => {
    validateSchoolImageFile(file, kind === "logo" ? "School logo" : "Cover image");

    const extension = getSchoolImageExtension(file);
    const bucketName = SCHOOL_IMAGE_BUCKET;
    const storagePath = `schools/${access.school.id}/${kind}-${Date.now()}.${extension}`;
    const uploadOptions = { upsert: true, contentType: file.type, cacheControl: "3600" };

    console.log(file);
    console.log(file.name);
    console.log(file.type);
    console.log(file.size);
    console.log(bucketName);
    console.log(storagePath);
    console.log(uploadOptions);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, uploadOptions);

    console.log("upload data", data);
    console.error("upload error", error);

    if (error) throw error;
    return data.path;
  };

  const refetchSchoolProfile = async () => {
    const refetchedSchool = await supabase
      .from("schools")
      .select("*")
      .eq("id", access.school.id)
      .maybeSingle();

    console.log("refetchedSchool", refetchedSchool);

    const { data, error } = refetchedSchool;
    if (error) throw error;
    if (!data) return;

    const latestSchool = data as {
      school_name: string;
      school_phone: string | null;
      school_email: string | null;
      address: string | null;
      website: string | null;
      logo_url: string | null;
      cover_image_url: string | null;
    };

    setForm({
      schoolName: latestSchool.school_name || "",
      phone: latestSchool.school_phone || "",
      email: latestSchool.school_email || "",
      address: latestSchool.address || "",
    });
    setSavedProfile({
      schoolName: latestSchool.school_name || "",
      phone: latestSchool.school_phone || "",
      email: latestSchool.school_email || "",
      address: latestSchool.address || "",
      logoPath: latestSchool.logo_url || null,
      coverPath: latestSchool.cover_image_url || null,
    });
    setLogoPath(latestSchool.logo_url || null);
    setCoverPath(latestSchool.cover_image_url || null);
    access.updateSchool({
      school_name: latestSchool.school_name,
      phone: latestSchool.school_phone,
      email: latestSchool.school_email,
      address: latestSchool.address,
      website: latestSchool.website,
      logo_url: latestSchool.logo_url,
      cover_image_url: latestSchool.cover_image_url,
    });
  };

  const saveSchoolProfile = async () => {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!hasProfileChanges) {
      setSaving(false);
      return;
    }

    let nextLogoPath = logoMarkedForRemoval ? null : logoPath;
    let nextCoverPath = coverMarkedForRemoval ? null : coverPath;

    try {
      if (logoFile) {
        nextLogoPath = await uploadSchoolImage(logoFile, "logo");
      }

      if (coverFile) {
        nextCoverPath = await uploadSchoolImage(coverFile, "cover");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Image upload လုပ်၍မရပါ။");
      setSaving(false);
      return;
    }

    const updatePayload = {
      school_name: form.schoolName.trim(),
      school_phone: form.phone.trim() || null,
      school_email: form.email.trim() || null,
      address: form.address.trim(),
      logo_url: nextLogoPath,
      cover_image_url: nextCoverPath,
      updated_at: new Date().toISOString(),
    };

    const { data: updateData, error } = await supabase
      .from("schools")
      .update(updatePayload as never)
      .eq("id", access.school.id)
      .select("school_name, school_phone, school_email, address, website, logo_url, cover_image_url")
      .maybeSingle();

    console.log("school update data", updateData);
    console.error("school update error", error);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setMessage("ကျောင်း profile ကို သိမ်းဆည်းပြီးပါပြီ။");
    }

    if (!error) {
      if (updateData) {
        const updatedSchool = updateData as {
          school_name: string;
          school_phone: string | null;
          school_email: string | null;
          address: string | null;
          website: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
        };

        setLogoPath(updatedSchool.logo_url || null);
        setCoverPath(updatedSchool.cover_image_url || null);
        access.updateSchool({
          school_name: updatedSchool.school_name,
          phone: updatedSchool.school_phone,
          email: updatedSchool.school_email,
          address: updatedSchool.address,
          website: updatedSchool.website,
          logo_url: updatedSchool.logo_url,
          cover_image_url: updatedSchool.cover_image_url,
        });
      }

      setLogoFile(null);
      setLogoMarkedForRemoval(false);
      setCoverFile(null);
      setCoverMarkedForRemoval(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
      if (coverInputRef.current) coverInputRef.current.value = "";

      try {
        await refetchSchoolProfile();
      } catch (refetchError) {
        console.error("school refetch failed after update", refetchError);
        setLogoPath(nextLogoPath);
        setCoverPath(nextCoverPath);
        setSavedProfile({
          schoolName: form.schoolName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          logoPath: nextLogoPath,
          coverPath: nextCoverPath,
        });
        access.updateSchool({
          school_name: form.schoolName.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim(),
          logo_url: nextLogoPath,
          cover_image_url: nextCoverPath,
        });
      }
    }

    setSaving(false);
  };

  const uploadSchoolLogo = async (file: File) => {
    setLogoUploading(true);
    setMessage("");
    setErrorMessage("");

    try {
      validateSchoolImageFile(file, "School logo");
      setLogoFile(file);
      setLogoMarkedForRemoval(false);
      setLogoPreviewUrl(URL.createObjectURL(file));
      setMessage("School logo ကို preview ပြထားပါသည်။ သိမ်းဆည်းမည် နှိပ်မှ အတည်ဖြစ်ပါမည်။");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "School logo ကို ရွေးချယ်၍မရပါ။");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }

    return;

    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        throw new Error("School logo ကို PNG, JPG, WEBP image file သာ တင်နိုင်ပါသည်။");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("School logo file size သည် 5 MB ထက် မကျော်ရပါ။");
      }

      const extension = getSchoolImageExtension(file);
      const bucketName = SCHOOL_IMAGE_BUCKET;
      const storagePath = `schools/${access.school.id}/logo-${Date.now()}.${extension}`;
      const uploadOptions = { upsert: true, contentType: file.type, cacheControl: "3600" };

      console.log(file);
      console.log(file.name);
      console.log(file.type);
      console.log(file.size);
      console.log(bucketName);
      console.log(storagePath);
      console.log(uploadOptions);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, uploadOptions);

      console.log(uploadError);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("schools")
        .update({
          logo_url: uploadData.path,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", access.school.id);

      if (updateError) throw updateError;

      setLogoPath(uploadData.path);
      setMessage("School logo ကို သိမ်းဆည်းပြီးပါပြီ။");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "School logo upload လုပ်၍မရပါ။");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const uploadSchoolCover = async (file: File) => {
    setCoverUploading(true);
    setMessage("");
    setErrorMessage("");

    try {
      validateSchoolImageFile(file, "Cover image");
      setCoverFile(file);
      setCoverMarkedForRemoval(false);
      setCoverPreviewUrl(URL.createObjectURL(file));
      setMessage("Cover image ကို preview ပြထားပါသည်။ သိမ်းဆည်းမည် နှိပ်မှ အတည်ဖြစ်ပါမည်။");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Cover image ကို ရွေးချယ်၍မရပါ။");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }

    return;

    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        throw new Error("Cover image ကို PNG, JPG, WEBP image file သာ တင်နိုင်ပါသည်။");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Cover image file size သည် 5 MB ထက် မကျော်ရပါ။");
      }

      const extension = getSchoolImageExtension(file);
      const bucketName = SCHOOL_IMAGE_BUCKET;
      const storagePath = `schools/${access.school.id}/cover-${Date.now()}.${extension}`;
      const uploadOptions = { upsert: true, contentType: file.type, cacheControl: "3600" };

      console.log(file);
      console.log(file.name);
      console.log(file.type);
      console.log(file.size);
      console.log(bucketName);
      console.log(storagePath);
      console.log(uploadOptions);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, uploadOptions);

      console.log(uploadError);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("schools")
        .update({
          cover_image_url: uploadData.path,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", access.school.id);

      if (updateError) throw updateError;

      setCoverPath(uploadData.path);
      setMessage("Cover image ကို သိမ်းဆည်းပြီးပါပြီ။");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Cover image upload လုပ်၍မရပါ။");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const removeSchoolLogo = async () => {
    if (!logoPath && !logoFile) return;

    setLogoUploading(true);
    setMessage("");
    setErrorMessage("");

    setLogoFile(null);
    setLogoMarkedForRemoval(true);
    setLogoPreviewUrl("");
    setMessage("School logo ကို ဖယ်ရှားရန် မှတ်ထားပါသည်။ သိမ်းဆည်းမည် နှိပ်မှ အတည်ဖြစ်ပါမည်။");
    setLogoUploading(false);

    return;

    const { error } = await supabase
      .from("schools")
      .update({
        logo_url: null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", access.school.id);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setLogoPath(null);
      setLogoPreviewUrl("");
      setMessage("School logo ကို ဖယ်ရှားပြီးပါပြီ။");
    }

    setLogoUploading(false);
  };

  const removeSchoolCover = async () => {
    if (!coverPath && !coverFile) return;

    setCoverUploading(true);
    setMessage("");
    setErrorMessage("");

    setCoverFile(null);
    setCoverMarkedForRemoval(true);
    setCoverPreviewUrl("");
    setMessage("Cover image ကို ဖယ်ရှားရန် မှတ်ထားပါသည်။ သိမ်းဆည်းမည် နှိပ်မှ အတည်ဖြစ်ပါမည်။");
    setCoverUploading(false);

    return;

    const { error } = await supabase
      .from("schools")
      .update({
        cover_image_url: null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", access.school.id);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setCoverPath(null);
      setCoverPreviewUrl("");
      setMessage("Cover image ကို ဖယ်ရှားပြီးပါပြီ။");
    }

    setCoverUploading(false);
  };

  return (
    <div className="space-y-4">
      <SectionHeader icon={School} title="School Profile" description="Approved school record မှ ရရှိထားသော အချက်အလက်များကို ပြသထားပါသည်။" />
      <GlassCard className="rounded-[2rem] p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="glass-panel flex min-h-44 flex-col items-center justify-center rounded-3xl p-4 text-center">
            <div className="theme-icon-tile-strong mb-3 h-24 w-24 overflow-hidden rounded-3xl">
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="School logo" className="h-full w-full object-cover" />
              ) : (
                <School className="h-10 w-10" />
              )}
            </div>
            <p className="text-sm font-semibold">School Logo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {logoFile || logoMarkedForRemoval ? "သိမ်းဆည်းမည် နှိပ်ရန် လိုအပ်ပါသည်" : logoPath ? "Logo uploaded" : "PNG, JPG, WEBP / Max 5 MB"}
            </p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadSchoolLogo(file);
              }}
            />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="aqua-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={logoUploading || saving}
                onClick={() => logoInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {logoUploading ? "Loading..." : logoPath || logoFile ? "Replace" : "Upload"}
              </button>
              {(logoPath || logoFile) && (
                <button
                  type="button"
                  className="glass-panel inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={logoUploading || saving}
                  onClick={removeSchoolLogo}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
          </div>
          <div className="glass-panel relative min-h-44 overflow-hidden rounded-3xl p-4">
            {coverPreviewUrl ? (
              <img src={coverPreviewUrl} alt="School cover" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-primary/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
            <div className="relative z-10 flex min-h-36 flex-col justify-end">
              <p className="text-sm font-semibold">Cover Image</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {coverFile || coverMarkedForRemoval ? "သိမ်းဆည်းမည် နှိပ်ရန် လိုအပ်ပါသည်" : coverPath ? "Cover image uploaded" : "PNG, JPG, WEBP / Max 5 MB"}
              </p>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadSchoolCover(file);
                }}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="aqua-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={coverUploading || saving}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {coverUploading ? "Loading..." : coverPath || coverFile ? "Replace" : "Upload"}
                </button>
                {(coverPath || coverFile) && (
                  <button
                    type="button"
                    className="glass-panel inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={coverUploading || saving}
                    onClick={removeSchoolCover}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <EditableProfileField label="School Name" value={form.schoolName} onChange={(value) => updateField("schoolName", value)} />
          <ProfileField label="School Type" value={access.school.school_type} />
          <ProfileField label="School Level" value={`${access.school.grade_from} to ${access.school.grade_to}`} />
          <ProfileField label="Region" value={access.school.region_name || ""} />
          <ProfileField label="Township" value={access.school.township_name || ""} />
          <EditableProfileField label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <EditableProfileField label="Email" value={form.email} onChange={(value) => updateField("email", value)} />
          <ProfileField label="Website" value={access.school.website || ""} />
          <ProfileField label="Principal" value="" />
          <ProfileField label="Vision" value="" multiline />
          <ProfileField label="Mission" value="" multiline />
          <EditableProfileField
            label="Address"
            value={form.address}
            onChange={(value) => updateField("address", value)}
            multiline
            className="md:col-span-2"
          />
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="aqua-button rounded-2xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving || !hasProfileChanges || !form.schoolName.trim() || !form.address.trim()}
            onClick={saveSchoolProfile}
          >
            {saving ? "Saving..." : "သိမ်းဆည်းမည်"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

export function PrincipalManagementPage() {
  return (
    <div className="space-y-4">
      <SectionHeader
        icon={UserCog}
        title="Principal Management"
        description="School Admin သည် Principal requests များကိုသာ approve/reject လုပ်ရန် UI ဖြစ်ပါသည်။"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <EmptyPanel icon={Clock3} title="Pending Principals" />
        <EmptyPanel icon={ShieldCheck} title="Approved Principals" />
        <EmptyPanel icon={Lock} title="Rejected Principals" />
      </div>
    </div>
  );
}

export function AttendancePage() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={ClipboardCheck} title="Attendance" description="Today's, weekly, monthly, and class attendance data will be shown here." />
      <div className="grid gap-4 lg:grid-cols-4">
        <EmptyPanel icon={CalendarDays} title="Today's Attendance" />
        <EmptyPanel icon={LineChart} title="Weekly" />
        <EmptyPanel icon={BarChart3} title="Monthly" />
        <EmptyPanel icon={School} title="Class Attendance" />
      </div>
    </div>
  );
}

export function AcademicPage() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={BookOpen} title="Academic" description="GPA, pass/fail rate, and subject performance will connect to real academic records later." />
      <div className="grid gap-4 lg:grid-cols-4">
        <EmptyPanel icon={TrendingUp} title="Overall GPA" />
        <EmptyPanel icon={ShieldCheck} title="Pass Rate" />
        <EmptyPanel icon={Activity} title="Fail Rate" />
        <EmptyPanel icon={BarChart3} title="Subject Performance" />
      </div>
    </div>
  );
}

export function ReportCardsPage() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={FileText} title="Report Cards" description="Search, preview, and PDF download UI is ready for backend integration." />
      <GlassCard className="rounded-[2rem] p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input className="aqua-input flex-1 rounded-2xl px-4 py-3 text-sm" placeholder="Search Student" disabled />
          <button className="glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold" disabled>
            <Search className="h-4 w-4" />
            Preview Report Card
          </button>
          <button className="aqua-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold" disabled>
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
        <EmptyState icon={FileText} title="No report card data available" description="Student report cards will appear after academic records are connected." />
      </GlassCard>
    </div>
  );
}

export function ReportsPage() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={FileBarChart} title="Reports" description="Report generation buttons are UI-only until report services are connected." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EmptyPanel icon={ClipboardCheck} title="Attendance Report" />
        <EmptyPanel icon={BookOpen} title="Academic Report" />
        <EmptyPanel icon={Users} title="Student Report" />
        <EmptyPanel icon={GraduationCap} title="Teacher Summary" />
      </div>
    </div>
  );
}

export function InstructionsPage() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={Megaphone} title="Instructions" description="School Admin can send instructions to Principal after backend integration." />
      <GlassCard className="rounded-[2rem] p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <input className="aqua-input rounded-2xl px-4 py-3 text-sm" placeholder="Instruction" disabled />
          <input className="aqua-input rounded-2xl px-4 py-3 text-sm" placeholder="Deadline" disabled />
          <input className="aqua-input rounded-2xl px-4 py-3 text-sm" placeholder="Priority" disabled />
        </div>
        <div className="mt-4">
          <EmptyState icon={ListChecks} title="No instructions available" description="Instruction title, status, completed, pending, and in-progress records are not connected yet." />
        </div>
      </GlassCard>
    </div>
  );
}

export function DocumentsPage() {
  const access = useSchoolAdminAccess();

  return (
    <div className="space-y-4">
      <SectionHeader icon={Download} title="Documents" description="Approved school documents are shown without fabricated records." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DocumentCard title="School License" available={Boolean(access.school.document_url)} />
        <DocumentCard title="Building Document" available={false} />
        <DocumentCard title="Land Document" available={false} />
        <DocumentCard title="Owner Application" available={false} />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={BarChart3} title="Analytics" description="Charts are intentionally empty until real analytics queries are added." />
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartEmptyCard icon={LineChart} title="Student Growth" description="No student growth data available." />
        <ChartEmptyCard icon={ClipboardCheck} title="Attendance Trend" description="No attendance trend data available." />
        <ChartEmptyCard icon={BookOpen} title="Academic Trend" description="No academic trend data available." />
        <ChartEmptyCard icon={PieChart} title="Gender Ratio" description="No gender ratio data available." />
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-4 pb-8">
      <SectionHeader icon={Settings} title="Settings" description="Settings UI is ready; persistence will be connected to backend later." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EmptyPanel icon={School} title="School Settings" />
        <EmptyPanel icon={Activity} title="Theme" />
        <EmptyPanel icon={Bell} title="Notification" />
        <EmptyPanel icon={Lock} title="Password" />
      </div>
    </div>
  );
}

function MetricEmptyCard({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <GlassCard className="rounded-[2rem] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="theme-icon-tile h-12 w-12 rounded-2xl">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          No data
        </span>
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">-</p>
      <div className="mt-4 h-10 rounded-2xl border border-dashed border-border/70 bg-muted/20" />
    </GlassCard>
  );
}

function ChartEmptyCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <GlassCard className="rounded-[2rem] p-6">
      <SectionTitle icon={Icon} title={title} />
      <div className="mt-5 flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/20 p-6 text-center">
        <div>
          <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">No data available</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function ManagementEmptyCard({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <GlassCard className="rounded-[2rem] p-6">
      <SectionTitle icon={Icon} title={title} />
      <div className="mt-4">
        <EmptyState icon={Icon} title="No data available" description="This section is waiting for real backend records." />
      </div>
    </GlassCard>
  );
}

function EmptyPanel({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <GlassCard className="rounded-[2rem] p-5">
      <SectionTitle icon={Icon} title={title} />
      <p className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        No data available
      </p>
    </GlassCard>
  );
}

function DocumentCard({ title, available }: { title: string; available: boolean }) {
  return (
    <GlassCard className="rounded-[2rem] p-5">
      <SectionTitle icon={FileText} title={title} />
      <p className="mt-4 text-sm text-muted-foreground">{available ? "Document path exists in the approved school record." : "No document available"}</p>
      <div className="mt-4 flex gap-2">
        <button className="glass-panel rounded-xl px-3 py-2 text-xs font-bold" disabled>
          Preview
        </button>
        <button className="aqua-button rounded-xl px-3 py-2 text-xs font-bold" disabled>
          Download
        </button>
      </div>
    </GlassCard>
  );
}

function ProfileField({
  label,
  value,
  multiline = false,
  className,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-sm font-semibold">{label}</span>
      {multiline ? (
        <textarea className="aqua-input min-h-24 w-full rounded-2xl px-4 py-3 text-sm" value={value} readOnly placeholder="No data available" />
      ) : (
        <input className="aqua-input w-full rounded-2xl px-4 py-3 text-sm" value={value} readOnly placeholder="No data available" />
      )}
    </label>
  );
}

function EditableProfileField({
  label,
  value,
  onChange,
  multiline = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-sm font-semibold">{label}</span>
      {multiline ? (
        <textarea
          className="aqua-input min-h-24 w-full rounded-2xl px-4 py-3 text-sm"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="No data available"
        />
      ) : (
        <input
          className="aqua-input w-full rounded-2xl px-4 py-3 text-sm"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="No data available"
        />
      )}
    </label>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="theme-icon-tile h-11 w-11 rounded-2xl">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="aqua-section-title text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-bold">{title}</h3>
    </div>
  );
}

function IconButton({ label, icon: Icon, disabled = false }: { label: string; icon: LucideIcon; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="glass-panel inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:glow-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
