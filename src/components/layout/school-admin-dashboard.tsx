import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Clock3,
  Download,
  Eye,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Loader2,
  Lock,
  LogOut,
  MailPlus,
  Menu,
  Megaphone,
  Moon,
  PieChart,
  RefreshCw,
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
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import {
  createPrincipalDocumentSignedUrl,
  getPrincipalManagementData,
  invitePrincipal,
  registerSelfPrincipal,
  reviewPrincipalRegistration,
} from "@/lib/api/principal-account.functions";
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
  { key: "students", label: "Total Students", icon: Users },
  { key: "teachers", label: "Total Teachers", icon: GraduationCap },
  { key: "classes", label: "Total Classes", icon: School },
  { key: "attendance", label: "Today's Attendance", icon: ClipboardCheck },
  { key: "absent", label: "Absent Students", icon: UserCheck },
  { key: "principalRequests", label: "Pending Principal Requests", icon: UserCog },
] as const;

type DashboardMetricKey = (typeof metricCards)[number]["key"];

type DashboardMetric = {
  value: number;
  loading: boolean;
  error: string;
  live: boolean;
};

type ActiveAcademicYear = {
  id: number;
  name: string;
  status: string | null;
};

type NotificationPreview = {
  id: string;
  title: string | null;
  message: string | null;
  created_at: string | null;
};

type PerformanceSummary = {
  score: number | null;
  status: string;
  loading: boolean;
  error: string;
};

const emptyMetric = (): DashboardMetric => ({
  value: 0,
  loading: true,
  error: "",
  live: false,
});

const createInitialDashboardMetrics = (): Record<DashboardMetricKey, DashboardMetric> => ({
  students: emptyMetric(),
  teachers: emptyMetric(),
  classes: emptyMetric(),
  attendance: emptyMetric(),
  absent: emptyMetric(),
  principalRequests: emptyMetric(),
});

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

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof globalThis.Error ? error.message : fallback;

const clearFileInput = (input: HTMLInputElement | null) => {
  if (input) input.value = "";
};

const getLocalDateString = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const safeCount = async (
  table: string,
  filters: Array<[string, string | number | boolean | null]>,
): Promise<{ count: number; error: string; live: boolean }> => {
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  for (const [column, value] of filters) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }

  const { count, error } = await query;
  if (error) return { count: 0, error: error.message, live: false };
  return { count: count ?? 0, error: "", live: true };
};

const fetchActiveAcademicYear = async (): Promise<{
  year: ActiveAcademicYear | null;
  error: string;
}> => {
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, name, status")
    .eq("status", "active")
    .maybeSingle();

  if (error) return { year: null, error: error.message };
  return { year: (data as ActiveAcademicYear | null) ?? null, error: "" };
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
  if (!access)
    throw new Error("useSchoolAdminAccess must be used inside SchoolAdminDashboardProvider.");
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
    navigate({ to: "/" });
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
              <img
                src={profileAvatarUrl}
                alt="School admin avatar"
                className="h-full w-full object-cover"
              />
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
            <div className="truncate text-[10px] uppercase tracking-tight text-muted-foreground">
              School Admin ERP
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggle}
            className="glass-panel flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs transition-all hover:glow-ring"
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
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
  const location = useLocation();
  const navigate = useNavigate();
  const access = useSchoolAdminAccess();
  const { theme, mounted, toggle } = useTheme();
  const schoolLogoUrl = useSchoolImagePreview(access.school.logo_url);
  const profileName = getProfileDisplayName(access.profile);
  const profileAvatarUrl = useProfileAvatarPreview(access.profile.avatar_url);
  const profileInitials = getInitials(profileName || access.profile.email);
  const [academicYearLabel, setAcademicYearLabel] = useState("Academic year not configured");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAcademicYear = async () => {
      const { year } = await fetchActiveAcademicYear();
      if (!active) return;
      setAcademicYearLabel(
        year?.name ? `${year.name} (${year.status || "active"})` : "Academic year not configured",
      );
    };

    loadAcademicYear();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

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
    navigate({ to: "/" });
  };

  return (
    <>
    <header className="aqua-panel sticky top-4 z-20 mb-6 flex flex-col gap-4 overflow-visible p-4 sm:flex-row sm:items-center sm:justify-between">
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
          <option>{academicYearLabel}</option>
        </select>
        <IconButton label="Notifications" icon={Bell} disabled />
        <div className="relative">
          <button
            type="button"
            aria-label="Open dashboard menu"
            aria-expanded={menuOpen}
            className="glass-panel inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:glow-ring"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="theme-icon-tile-strong flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-primary/25 text-xs font-bold shadow-inner"
          aria-label="Open school admin profile"
        >
          {profileAvatarUrl ? (
            <img
              src={profileAvatarUrl}
              alt="School admin avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{profileInitials}</span>
          )}
        </button>
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
      </div>
    </header>
    {menuOpen && (
      <div className="fixed inset-0 z-[100]">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
        <aside className="aqua-card fixed right-0 top-0 z-[101] flex h-screen w-[90vw] max-w-[320px] flex-col rounded-none p-3 shadow-2xl">
          <div className="mb-4 flex items-start justify-between">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setProfileOpen(true);
              }}
              className="glass-panel mr-2 flex flex-1 items-center gap-3 rounded-xl p-3 text-left"
            >
              <div className="theme-icon-tile-strong h-10 w-10 overflow-hidden rounded-full text-xs font-bold shadow-inner">
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{profileInitials}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{profileName}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {access.profile.email}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="glass-panel rounded-xl p-3"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                        active ? "theme-active-surface" : "text-muted-foreground hover:bg-accent/35",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-3 px-2">
              <div className="theme-icon-tile-strong h-8 w-8 rounded-lg">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold">Myanmar EDU</div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  School Admin ERP
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggle}
                className="glass-panel flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition-colors"
                aria-label="Toggle theme"
              >
                {mounted ? (
                  theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )
                ) : (
                  <div className="h-4 w-4" />
                )}
                <span>{mounted ? (theme === "dark" ? "Light" : "Dark") : "Theme"}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="glass-panel flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>
      </div>
    )}
    </>
  );
}

export function SchoolAdminDashboardOverview() {
  const access = useSchoolAdminAccess();
  const [metrics, setMetrics] = useState<Record<DashboardMetricKey, DashboardMetric>>(
    createInitialDashboardMetrics,
  );
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const [performance, setPerformance] = useState<PerformanceSummary>({
    score: null,
    status: "Waiting for backend data",
    loading: true,
    error: "",
  });

  useEffect(() => {
    let active = true;

    const fetchDashboardData = async () => {
      setMetrics(createInitialDashboardMetrics());
      setNotificationsLoading(true);
      setNotificationsError("");
      setPerformance({
        score: null,
        status: "Waiting for backend data",
        loading: true,
        error: "",
      });

      const schoolId = access.school.id;
      const today = getLocalDateString();
      const { year } = await fetchActiveAcademicYear();
      if (!active) return;

      const classFilters: Array<[string, string | number | boolean | null]> = [
        ["school_id", schoolId],
      ];
      if (year?.name) classFilters.push(["academic_year", year.name]);

      const [students, teachers, classes, attendance, absent, principalRequests] =
        await Promise.all([
          safeCount("students", [["school_id", schoolId]]),
          safeCount("teachers", [["school_id", schoolId]]),
          safeCount("school_classes", classFilters),
          // TODO: Confirm attendance table/column names. Falls back to 0 if attendance_records.attendance_date is not available.
          safeCount("attendance_records", [
            ["school_id", schoolId],
            ["attendance_date", today],
          ]),
          // TODO: Confirm absent status enum/value. Falls back to 0 if the table/column is not available.
          safeCount("attendance_records", [
            ["school_id", schoolId],
            ["attendance_date", today],
            ["status", "absent"],
          ]),
          safeCount("registration_requests", [
            ["approved_school_id", schoolId],
            ["request_type", "principal"],
            ["status", "pending"],
          ]),
        ]);

      if (!active) return;

      setMetrics({
        students: {
          value: students.count,
          loading: false,
          error: students.error,
          live: students.live,
        },
        teachers: {
          value: teachers.count,
          loading: false,
          error: teachers.error,
          live: teachers.live,
        },
        classes: { value: classes.count, loading: false, error: classes.error, live: classes.live },
        attendance: {
          value: attendance.count,
          loading: false,
          error: attendance.error,
          live: attendance.live,
        },
        absent: { value: absent.count, loading: false, error: absent.error, live: absent.live },
        principalRequests: {
          value: principalRequests.count,
          loading: false,
          error: principalRequests.error,
          live: principalRequests.live,
        },
      });

      // TODO: Confirm notifications table/columns and whether records are school-scoped or user-scoped.
      const { data: notificationData, error: notificationError } = await supabase
        .from("notifications")
        .select("id, title, message, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!active) return;

      if (notificationError) {
        setNotifications([]);
        setNotificationsError(notificationError.message);
      } else {
        setNotifications((notificationData || []) as NotificationPreview[]);
        setNotificationsError("");
      }
      setNotificationsLoading(false);

      const attendanceRate =
        students.count > 0 && attendance.live
          ? Math.round((attendance.count / students.count) * 100)
          : null;
      setPerformance({
        score: attendanceRate,
        status:
          attendanceRate === null ? "Waiting for backend data" : `${attendanceRate}% Attendance`,
        loading: false,
        error: attendance.error || students.error,
      });
    };

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [access.school.id]);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={`${access.school.school_name} အတွက် overview widgets များ။ Real backend data မရှိသေးသောနေရာများတွင် empty state ပြထားသည်။`}
      />

      {Object.values(metrics).some((metric) => metric.error) && (
        <div className="glass-panel rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
          Some dashboard data is not available yet. Missing tables/columns are shown as safe
          fallback values.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.key}
            icon={metric.icon}
            label={metric.label}
            loading={metrics[metric.key].loading}
            value={metrics[metric.key].value}
            live={metrics[metric.key].live}
            error={metrics[metric.key].error}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ManagementSummaryCard
          icon={UserCog}
          title="Pending Principal Requests"
          value={metrics.principalRequests.value}
          loading={metrics.principalRequests.loading}
          live={metrics.principalRequests.live}
          error={metrics.principalRequests.error}
          emptyDescription="No pending principal requests for this school."
        />
        <RecentNotificationsCard
          notifications={notifications}
          loading={notificationsLoading}
          error={notificationsError}
        />
        <GlassCard className="rounded-[2rem] p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={TrendingUp} title="School Performance Score" />
            <span
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
              title={performance.error || undefined}
            >
              {performance.loading ? "Loading..." : performance.status}
            </span>
          </div>
          {performance.score === null ? (
            <EmptyState
              icon={Activity}
              title="No performance data available"
              description="Attendance, academic, teacher ratio, reports, and school health will appear after backend integration."
            />
          ) : (
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
              <p className="text-sm font-semibold text-muted-foreground">Current score</p>
              <p className="mt-2 text-4xl font-bold text-foreground">{performance.score}%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Based on today's available attendance records for this school.
              </p>
            </div>
          )}
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
        const latestCoverPath =
          (data as { cover_image_url?: string | null }).cover_image_url || null;
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
  }, [
    coverFile,
    coverMarkedForRemoval,
    coverPath,
    form,
    logoFile,
    logoMarkedForRemoval,
    logoPath,
    savedProfile,
  ]);

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
      .select(
        "school_name, school_phone, school_email, address, website, logo_url, cover_image_url",
      )
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

      const uploadedLogoPath = uploadData?.path || "";
      if (uploadError || !uploadedLogoPath) {
        throw uploadError ?? new Error("School logo upload result မရရှိပါ။");
      }

      const { error: updateError } = await supabase
        .from("schools")
        .update({
          logo_url: uploadedLogoPath,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", access.school.id);

      if (updateError) throw updateError;

      setLogoPath(uploadedLogoPath);
      setMessage("School logo ကို သိမ်းဆည်းပြီးပါပြီ။");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "School logo upload လုပ်၍မရပါ။"));
    } finally {
      setLogoUploading(false);
      clearFileInput(logoInputRef.current);
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

      const uploadedCoverPath = uploadData?.path || "";
      if (uploadError || !uploadedCoverPath) {
        throw uploadError ?? new Error("Cover image upload result မရရှိပါ။");
      }

      const { error: updateError } = await supabase
        .from("schools")
        .update({
          cover_image_url: uploadedCoverPath,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", access.school.id);

      if (updateError) throw updateError;

      setCoverPath(uploadedCoverPath);
      setMessage("Cover image ကို သိမ်းဆည်းပြီးပါပြီ။");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Cover image upload လုပ်၍မရပါ။"));
    } finally {
      setCoverUploading(false);
      clearFileInput(coverInputRef.current);
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
      setErrorMessage(error?.message ?? "School logo ကို ဖယ်ရှား၍မရပါ။");
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
      setErrorMessage(error?.message ?? "Cover image ကို ဖယ်ရှား၍မရပါ။");
    } else {
      setCoverPath(null);
      setCoverPreviewUrl("");
      setMessage("Cover image ကို ဖယ်ရှားပြီးပါပြီ။");
    }

    setCoverUploading(false);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={School}
        title="School Profile"
        description="Approved school record မှ ရရှိထားသော အချက်အလက်များကို ပြသထားပါသည်။"
      />
      <GlassCard className="rounded-[2rem] p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="glass-panel flex min-h-44 flex-col items-center justify-center rounded-3xl p-4 text-center">
            <div className="theme-icon-tile-strong mb-3 h-24 w-24 overflow-hidden rounded-3xl">
              {logoPreviewUrl ? (
                <img
                  src={logoPreviewUrl}
                  alt="School logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <School className="h-10 w-10" />
              )}
            </div>
            <p className="text-sm font-semibold">School Logo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {logoFile || logoMarkedForRemoval
                ? "သိမ်းဆည်းမည် နှိပ်ရန် လိုအပ်ပါသည်"
                : logoPath
                  ? "Logo uploaded"
                  : "PNG, JPG, WEBP / Max 5 MB"}
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
              <img
                src={coverPreviewUrl}
                alt="School cover"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-primary/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
            <div className="relative z-10 flex min-h-36 flex-col justify-end">
              <p className="text-sm font-semibold">Cover Image</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {coverFile || coverMarkedForRemoval
                  ? "သိမ်းဆည်းမည် နှိပ်ရန် လိုအပ်ပါသည်"
                  : coverPath
                    ? "Cover image uploaded"
                    : "PNG, JPG, WEBP / Max 5 MB"}
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
          <EditableProfileField
            label="School Name"
            value={form.schoolName}
            onChange={(value) => updateField("schoolName", value)}
          />
          <ProfileField label="School Type" value={access.school.school_type} />
          <ProfileField
            label="School Level"
            value={`${access.school.grade_from} to ${access.school.grade_to}`}
          />
          <ProfileField label="Region" value={access.school.region_name || ""} />
          <ProfileField label="Township" value={access.school.township_name || ""} />
          <EditableProfileField
            label="Phone"
            value={form.phone}
            onChange={(value) => updateField("phone", value)}
          />
          <EditableProfileField
            label="Email"
            value={form.email}
            onChange={(value) => updateField("email", value)}
          />
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
            disabled={
              saving || !hasProfileChanges || !form.schoolName.trim() || !form.address.trim()
            }
            onClick={saveSchoolProfile}
          >
            {saving ? "Saving..." : "သိမ်းဆည်းမည်"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

type PrincipalRequestStatus = "invited" | "pending" | "approved" | "rejected";

type PrincipalRegistrationRequest = {
  id: string;
  email: string;
  phone: string | null;
  full_name_mm: string | null;
  full_name_en: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nrc_number: string | null;
  residential_address: string | null;
  state_region_id: number | null;
  township_id: number | null;
  nrc_front_url: string | null;
  nrc_back_url: string | null;
  status: PrincipalRequestStatus;
  invite_note: string | null;
  invite_token_expires_at: string | null;
  highest_education: string | null;
  major: string | null;
  years_of_teaching_experience: number | null;
  years_of_management_experience: number | null;
  previous_school: string | null;
  current_position: string | null;
  profile_photo_url: string | null;
  degree_certificate_url: string | null;
  teaching_license_url: string | null;
  appointment_letter_url: string | null;
  resume_url: string | null;
  recommendation_letter_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ActivePrincipal = {
  id: string;
  profile_id: string | null;
  school_id: string | null;
  level: string | null;
  created_at: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type ActivePrincipalProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string | null;
};

type PrincipalTab = "invited" | "pending" | "active";
type PrincipalMode = "self" | "invite";

const principalRegistrationRequestSelect = [
  "id",
  "email",
  "phone",
  "full_name_mm",
  "full_name_en",
  "date_of_birth",
  "gender",
  "nrc_number",
  "residential_address",
  "state_region_id",
  "township_id",
  "nrc_front_url",
  "nrc_back_url",
  "status",
  "invite_note",
  "invite_token_expires_at",
  "highest_education",
  "major",
  "years_of_teaching_experience",
  "years_of_management_experience",
  "previous_school",
  "current_position",
  "profile_photo_url",
  "degree_certificate_url",
  "teaching_license_url",
  "appointment_letter_url",
  "resume_url",
  "recommendation_letter_url",
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "rejection_reason",
  "reviewed_at",
  "created_at",
  "updated_at",
].join(", ");

type PrincipalSelfFormValues = {
  fullNameMm: string;
  fullNameEn: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nrcNumber: string;
  residentialAddress: string;
  stateRegionId: string;
  townshipId: string;
  highestEducation: string;
  major: string;
  yearsOfTeachingExperience: string;
  yearsOfManagementExperience: string;
  previousSchool: string;
  currentPosition: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  declarationAccepted: boolean;
};

type PrincipalSelfFileKey =
  | "profilePhoto"
  | "nrcFront"
  | "nrcBack"
  | "degreeCertificate"
  | "teachingLicense"
  | "appointmentLetter"
  | "resume"
  | "recommendationLetter";

type RegionOption = { id: number; name: string };
type TownshipOption = { id: number; region_id: number; name: string };
type PrincipalDocumentBucket = "application-nrc-docs" | "application-school-docs";

type PrincipalUploadedDocument = {
  documentType: PrincipalSelfFileKey;
  label: string;
  bucket: PrincipalDocumentBucket;
  path: string | null;
  buttonLabel: string;
  required?: boolean;
  optional?: boolean;
};

const principalSelfFileLabels: Record<PrincipalSelfFileKey, string> = {
  profilePhoto: "Profile photo",
  nrcFront: "NRC front",
  nrcBack: "NRC back",
  degreeCertificate: "Degree certificate",
  teachingLicense: "Teaching license",
  appointmentLetter: "Appointment letter",
  resume: "Resume",
  recommendationLetter: "Recommendation letter",
};

const principalSelfFileKeys: PrincipalSelfFileKey[] = [
  "profilePhoto",
  "nrcFront",
  "nrcBack",
  "degreeCertificate",
  "teachingLicense",
  "appointmentLetter",
  "resume",
  "recommendationLetter",
];

const sanitizeDashboardFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9.\-_]+/g, "-").slice(0, 90);

export function PrincipalManagementPage() {
  const access = useSchoolAdminAccess();
  const [tab, setTab] = useState<PrincipalTab>("invited");
  const [principalMode, setPrincipalMode] = useState<PrincipalMode | null>(null);
  const [requests, setRequests] = useState<PrincipalRegistrationRequest[]>([]);
  const [activePrincipal, setActivePrincipal] = useState<ActivePrincipal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [inviting, setInviting] = useState(false);
  const [manualInviteLink, setManualInviteLink] = useState("");
  const [manualInviteCopied, setManualInviteCopied] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [rejectingId, setRejectingId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selfForm, setSelfForm] = useState<PrincipalSelfFormValues>({
    fullNameMm: access.profile.full_name || "",
    fullNameEn: "",
    phone: access.profile.phone || "",
    dateOfBirth: "",
    gender: "",
    nrcNumber: "",
    residentialAddress: "",
    stateRegionId: "",
    townshipId: "",
    highestEducation: "",
    major: "",
    yearsOfTeachingExperience: "0",
    yearsOfManagementExperience: "0",
    previousSchool: "",
    currentPosition: "Principal",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    declarationAccepted: false,
  });
  const [selfFiles, setSelfFiles] = useState<Partial<Record<PrincipalSelfFileKey, File>>>({});
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [townships, setTownships] = useState<TownshipOption[]>([]);
  const [allTownships, setAllTownships] = useState<TownshipOption[]>([]);
  const [selfSubmitting, setSelfSubmitting] = useState(false);

  const invitedRequests = requests.filter((request) => request.status === "invited");
  const pendingRequests = requests.filter((request) => request.status === "pending");
  const regionNameById = useMemo(
    () => new Map(regions.map((region) => [region.id, region.name])),
    [regions],
  );
  const townshipNameById = useMemo(
    () => new Map(allTownships.map((township) => [township.id, township.name])),
    [allTownships],
  );

  const loadPrincipalData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setRefreshing(!showSpinner);
    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      const result = await getPrincipalManagementData({
        data: {
          accessToken,
        },
      });

      setRequests((result.requests || []) as PrincipalRegistrationRequest[]);
      setActivePrincipal((result.activePrincipal || null) as ActivePrincipal | null);
      setRegions((result.regions || []) as RegionOption[]);
      setAllTownships((result.townships || []) as TownshipOption[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Principal အချက်အလက်များကို ယာယီဖွင့်မရပါ။ ပြန်စမ်းကြည့်ပါ။",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPrincipalData();
  }, [access.school.id]);

  useEffect(() => {
    if (!selfForm.stateRegionId) {
      setTownships([]);
      setSelfForm((current) => ({ ...current, townshipId: "" }));
      return;
    }

    setTownships(
      allTownships.filter((township) => township.region_id === Number(selfForm.stateRegionId)),
    );
  }, [allTownships, selfForm.stateRegionId]);

  const getAccessToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error("Please sign in again to continue.");
    return token;
  };

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage("Enter a valid Principal email.");
      return;
    }

    setInviting(true);
    setMessage("");
    setErrorMessage("");
    setManualInviteLink("");
    setManualInviteCopied(false);

    try {
      const accessToken = await getAccessToken();
      const result = await invitePrincipal({
        data: {
          accessToken,
          email: normalizedEmail,
          note: inviteNote || undefined,
        },
      });

      setMessage(
        result.emailSent ? `Principal invite email sent to ${result.email}.` : result.message,
      );
      setManualInviteLink(result.manualMode ? result.inviteUrl : "");
      setInviteEmail("");
      setInviteNote("");
      await loadPrincipalData(false);
    } catch (error) {
      console.error("[Principal invite UI] Unable to create Principal invite", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create Principal invite.",
      );
    } finally {
      setInviting(false);
    }
  };

  const copyManualInviteLink = async () => {
    if (!manualInviteLink) return;

    try {
      await navigator.clipboard.writeText(manualInviteLink);
      setManualInviteCopied(true);
    } catch (error) {
      console.error("[Principal invite UI] Unable to copy manual invite link", error);
      setErrorMessage("Unable to copy the Principal invite link.");
    }
  };

  const openPrincipalDocument = async (document: PrincipalUploadedDocument) => {
    if (!document.path) return;

    setErrorMessage("");

    try {
      const accessToken = await getAccessToken();
      const result = await createPrincipalDocumentSignedUrl({
        data: {
          accessToken,
          bucket: document.bucket,
          path: document.path,
        },
      });

      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : `${document.label} file ကို ဖွင့်၍မရပါ။`,
      );
    }
  };

  const updateSelfForm = (key: keyof PrincipalSelfFormValues, value: string | boolean) => {
    setSelfForm((current) => ({ ...current, [key]: value }));
  };

  const validateSelfPrincipalForm = () => {
    const required: Array<[keyof PrincipalSelfFormValues, string]> = [
      ["fullNameMm", "Full name is required."],
      ["fullNameEn", "English name is required."],
      ["phone", "Phone is required."],
      ["dateOfBirth", "Date of birth is required."],
      ["gender", "Gender is required."],
      ["nrcNumber", "NRC number is required."],
      ["residentialAddress", "Residential address is required."],
      ["highestEducation", "Highest education is required."],
      ["major", "Major is required."],
      ["currentPosition", "Current position is required."],
      ["emergencyContactName", "Emergency contact name is required."],
      ["emergencyContactRelationship", "Emergency contact relationship is required."],
      ["emergencyContactPhone", "Emergency contact phone is required."],
    ];

    for (const [key, error] of required) {
      if (!String(selfForm[key] || "").trim()) return error;
    }

    if (!selfForm.stateRegionId) return "State/Region is required.";
    if (!selfForm.townshipId) return "Township is required.";
    if (!selfFiles.nrcFront || !selfFiles.nrcBack) return "NRC front and back files are required.";
    if (!selfForm.declarationAccepted) return "Please accept the declaration.";
    return "";
  };

  const uploadSelfPrincipalFile = async (
    key: PrincipalSelfFileKey,
    bucket: string,
    folder: string,
    stamp: number,
  ) => {
    const file = selfFiles[key];
    if (!file) return null;

    const path = `${folder}/${stamp}-${key}-${sanitizeDashboardFileName(file.name)}`;
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) throw error;
    return data?.path || null;
  };

  const handleSelfPrincipalConfirm = async () => {
    setMessage("");
    setErrorMessage("");
    setManualInviteLink("");
    setManualInviteCopied(false);
    setSelfSubmitting(true);

    try {
      const accessToken = await getAccessToken();
      const result = await registerSelfPrincipal({
        data: {
          accessToken,
        },
      });

      setMessage(result.message);
      setTab("active");
      await loadPrincipalData(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to register School Admin as Principal.",
      );
    } finally {
      setSelfSubmitting(false);
    }
  };

  const reviewRequest = async (requestId: string, status: "approved" | "rejected") => {
    if (status === "rejected" && !rejectionReason.trim()) {
      setErrorMessage("Rejection reason is required.");
      return;
    }

    setReviewingId(requestId);
    setMessage("");
    setErrorMessage("");
    setManualInviteLink("");
    setManualInviteCopied(false);

    try {
      const accessToken = await getAccessToken();
      const result = await reviewPrincipalRegistration({
        data: {
          accessToken,
          requestId,
          status,
          rejectionReason: status === "rejected" ? rejectionReason.trim() : undefined,
        },
      });

      setMessage(
        result.message ||
          (status === "approved" ? "Principal approved." : "Principal request rejected."),
      );
      setRejectingId("");
      setRejectionReason("");
      await loadPrincipalData(false);
      if (status === "approved") setTab("active");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to review Principal request.",
      );
    } finally {
      setReviewingId("");
    }
  };

  const tabs: Array<{ key: PrincipalTab; label: string; count: number; icon: LucideIcon }> = [
    { key: "invited", label: "Pending Invitations", count: invitedRequests.length, icon: MailPlus },
    { key: "pending", label: "Pending Reviews", count: pendingRequests.length, icon: Clock3 },
    { key: "active", label: "Active Principal", count: activePrincipal ? 1 : 0, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-4 pb-8">
      <SectionHeader
        icon={UserCog}
        title="Principal Management"
        description={`Invite, review, and manage the Principal account for ${access.school.school_name}.`}
      />

      <GlassCard className="rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle
            icon={principalMode === "self" ? UserCheck : MailPlus}
            title="Principal Setup"
          />
          <button
            type="button"
            className="glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => loadPrincipalData(false)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            className={cn(
              "rounded-3xl border p-4 text-left transition",
              principalMode === "self"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40",
            )}
            onClick={() => {
              setPrincipalMode("self");
              setManualInviteLink("");
              setManualInviteCopied(false);
            }}
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <UserCheck className="h-4 w-4" />
              I am the Principal
            </span>
            <span className="mt-2 block text-xs leading-5">
              Set your current School Admin account as the Principal.
            </span>
          </button>
          <button
            type="button"
            className={cn(
              "rounded-3xl border p-4 text-left transition",
              principalMode === "invite"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40",
            )}
            onClick={() => setPrincipalMode("invite")}
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <MailPlus className="h-4 w-4" />
              Invite Another Principal
            </span>
            <span className="mt-2 block text-xs leading-5">
              Enter a new user email and send the invitation by email.
            </span>
          </button>
        </div>

        {principalMode === "self" && (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <SectionTitle icon={UserCheck} title="Confirm Principal Role" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              You are setting yourself as the Principal of this school.
            </p>
            <button
              type="button"
              className="aqua-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              onClick={handleSelfPrincipalConfirm}
              disabled={selfSubmitting || Boolean(activePrincipal)}
            >
              {selfSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              {selfSubmitting ? "Confirming..." : "Confirm as Principal"}
            </button>
          </div>
        )}

        {principalMode === "invite" && (
          <PrincipalInviteForm
            email={inviteEmail}
            note={inviteNote}
            inviting={inviting}
            activePrincipal={Boolean(activePrincipal)}
            onEmailChange={setInviteEmail}
            onNoteChange={setInviteNote}
            onSubmit={handleInvite}
          />
        )}

        {principalMode && activePrincipal && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-700 dark:text-amber-200">
            This school already has an active Principal. New setup actions are disabled until the
            active Principal changes.
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
            {message}
          </div>
        )}

        {manualInviteLink && (
          <div className="mt-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1 space-y-2">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-200">
                  Development manual invite link
                </span>
                <input
                  className="aqua-input w-full rounded-2xl px-4 py-3 text-sm"
                  value={manualInviteLink}
                  readOnly
                />
              </label>
              <button
                type="button"
                className="glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-amber-700 transition hover:glow-ring dark:text-amber-200"
                onClick={copyManualInviteLink}
              >
                {manualInviteCopied ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {manualInviteCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </GlassCard>

      <>
        <div className="glass-panel flex flex-col gap-2 rounded-3xl p-2 sm:flex-row">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition",
                tab === item.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
              onClick={() => setTab(item.key)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  tab === item.key ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <GlassCard className="rounded-[2rem] p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
            Loading Principal data...
          </GlassCard>
        ) : (
          <div key={tab} className="min-w-0" data-principal-tab={tab}>
            {tab === "invited" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {invitedRequests.length > 0 ? (
                  invitedRequests.map((request) => (
                    <PrincipalInviteCard key={request.id} request={request} />
                  ))
                ) : (
                  <EmptyState
                    icon={MailPlus}
                    title="No pending invitations"
                    description="Invited Principal links that are not submitted yet will appear here."
                  />
                )}
              </div>
            ) : tab === "pending" ? (
              <div className="space-y-4">
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((request) => (
                    <PrincipalReviewCard
                      key={request.id}
                      request={request}
                      schoolName={access.school.school_name}
                      schoolType={access.school.school_type}
                      schoolAddress={access.school.address}
                      regionName={
                        request.state_region_id
                          ? regionNameById.get(request.state_region_id) ||
                            String(request.state_region_id)
                          : null
                      }
                      townshipName={
                        request.township_id
                          ? townshipNameById.get(request.township_id) ||
                            String(request.township_id)
                          : null
                      }
                      reviewing={reviewingId === request.id}
                      rejecting={rejectingId === request.id}
                      rejectionReason={rejectionReason}
                      onRejectingChange={(active) => {
                        setRejectingId(active ? request.id : "");
                        setRejectionReason("");
                      }}
                      onRejectionReasonChange={setRejectionReason}
                      onApprove={() => reviewRequest(request.id, "approved")}
                      onReject={() => reviewRequest(request.id, "rejected")}
                      onOpenDocument={openPrincipalDocument}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={Clock3}
                    title="No pending reviews"
                    description="Submitted Principal registration forms waiting for School Admin review will appear here."
                  />
                )}
              </div>
            ) : (
              <PrincipalActiveCard
                principal={activePrincipal}
                schoolName={access.school.school_name}
              />
            )}
          </div>
        )}
      </>
    </div>
  );
}

function PrincipalManagementPlaceholderPage() {
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

function PrincipalInviteForm({
  email,
  note,
  inviting,
  activePrincipal,
  onEmailChange,
  onNoteChange,
  onSubmit,
}: {
  email: string;
  note: string;
  inviting: boolean;
  activePrincipal: boolean;
  onEmailChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Principal Email</span>
          <input
            type="email"
            className="aqua-input w-full rounded-2xl px-4 py-3 text-sm"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="principal@example.com"
            required
          />
          <span className="block text-xs text-muted-foreground">
            This email must belong to a new user.
          </span>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Optional Note</span>
          <input
            className="aqua-input w-full rounded-2xl px-4 py-3 text-sm"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Short message for the invited Principal"
          />
        </label>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="aqua-button inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
          disabled={inviting || !email.trim() || activePrincipal}
        >
          {inviting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MailPlus className="h-4 w-4" />
          )}
          {inviting ? "Sending Email..." : "Send Principal Invite"}
        </button>
      </div>
    </form>
  );
}

function PrincipalSelfForm({
  access,
  activePrincipal,
  form,
  files,
  regions,
  townships,
  submitting,
  onSubmit,
  onFormChange,
  onFileChange,
}: {
  access: SchoolAdminAccess;
  activePrincipal: boolean;
  form: PrincipalSelfFormValues;
  files: Partial<Record<PrincipalSelfFileKey, File>>;
  regions: RegionOption[];
  townships: TownshipOption[];
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: (key: keyof PrincipalSelfFormValues, value: string | boolean) => void;
  onFileChange: (key: PrincipalSelfFileKey, file: File | undefined) => void;
}) {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <PrincipalTextInput
          label="Full name"
          value={form.fullNameMm}
          onChange={(value) => onFormChange("fullNameMm", value)}
        />
        <PrincipalTextInput
          label="English name"
          value={form.fullNameEn}
          onChange={(value) => onFormChange("fullNameEn", value)}
        />
        <PrincipalTextInput label="Email" value={access.profile.email} readOnly />
        <PrincipalTextInput
          label="Phone"
          value={form.phone}
          onChange={(value) => onFormChange("phone", value)}
        />
        <PrincipalTextInput
          label="Date of birth"
          type="date"
          value={form.dateOfBirth}
          onChange={(value) => onFormChange("dateOfBirth", value)}
        />
        <PrincipalSelectInput
          label="Gender"
          value={form.gender}
          onChange={(value) => onFormChange("gender", value)}
          options={["Male", "Female", "Other"]}
        />
        <PrincipalTextInput
          label="NRC number"
          value={form.nrcNumber}
          onChange={(value) => onFormChange("nrcNumber", value)}
        />
        <PrincipalSelectInput
          label="State/Region"
          value={form.stateRegionId}
          onChange={(value) => onFormChange("stateRegionId", value)}
          options={regions.map((region) => ({ value: String(region.id), label: region.name }))}
        />
        <PrincipalSelectInput
          label="Township"
          value={form.townshipId}
          onChange={(value) => onFormChange("townshipId", value)}
          options={townships.map((township) => ({
            value: String(township.id),
            label: township.name,
          }))}
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold">Residential address</span>
          <textarea
            className="aqua-input min-h-24 w-full rounded-2xl px-4 py-3 text-sm"
            value={form.residentialAddress}
            onChange={(event) => onFormChange("residentialAddress", event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PrincipalTextInput
          label="Highest education"
          value={form.highestEducation}
          onChange={(value) => onFormChange("highestEducation", value)}
        />
        <PrincipalTextInput
          label="Major"
          value={form.major}
          onChange={(value) => onFormChange("major", value)}
        />
        <PrincipalTextInput
          label="Teaching experience years"
          type="number"
          value={form.yearsOfTeachingExperience}
          onChange={(value) => onFormChange("yearsOfTeachingExperience", value)}
        />
        <PrincipalTextInput
          label="Management experience years"
          type="number"
          value={form.yearsOfManagementExperience}
          onChange={(value) => onFormChange("yearsOfManagementExperience", value)}
        />
        <PrincipalTextInput
          label="Previous school"
          value={form.previousSchool}
          onChange={(value) => onFormChange("previousSchool", value)}
        />
        <PrincipalTextInput
          label="Current position"
          value={form.currentPosition}
          onChange={(value) => onFormChange("currentPosition", value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {principalSelfFileKeys.map((key) => (
          <PrincipalFileInput
            key={key}
            label={`${principalSelfFileLabels[key]}${
              key === "nrcFront" || key === "nrcBack" ? " *" : ""
            }`}
            file={files[key]}
            onChange={(file) => onFileChange(key, file)}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PrincipalTextInput
          label="Emergency contact name"
          value={form.emergencyContactName}
          onChange={(value) => onFormChange("emergencyContactName", value)}
        />
        <PrincipalTextInput
          label="Relationship"
          value={form.emergencyContactRelationship}
          onChange={(value) => onFormChange("emergencyContactRelationship", value)}
        />
        <PrincipalTextInput
          label="Emergency phone"
          value={form.emergencyContactPhone}
          onChange={(value) => onFormChange("emergencyContactPhone", value)}
        />
      </div>

      <label className="glass-panel flex items-start gap-3 rounded-2xl p-4 text-sm">
        <input
          type="checkbox"
          checked={form.declarationAccepted}
          onChange={(event) => onFormChange("declarationAccepted", event.target.checked)}
          className="mt-1"
        />
        <span>I confirm that the Principal information provided is true and correct.</span>
      </label>

      <button
        type="submit"
        className="aqua-button inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting || activePrincipal}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserCheck className="h-4 w-4" />
        )}
        {submitting ? "Saving Principal..." : "Save as Principal"}
      </button>
    </form>
  );
}

function PrincipalTextInput({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className="aqua-input w-full rounded-2xl px-4 py-3 text-sm"
      />
    </label>
  );
}

function PrincipalSelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string | { value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <select
        className="aqua-input w-full rounded-2xl px-4 py-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function PrincipalFileInput({
  label,
  file,
  onChange,
}: {
  label: string;
  file?: File;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <label className="glass-panel flex cursor-pointer items-center justify-between gap-3 rounded-2xl p-4">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {file?.name || "Choose file"}
        </span>
      </span>
      <Upload className="h-4 w-4 shrink-0 text-primary" />
      <input
        type="file"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </label>
  );
}

function PrincipalInviteCard({ request }: { request: PrincipalRegistrationRequest }) {
  const expiresAt = request.invite_token_expires_at
    ? formatDashboardDate(request.invite_token_expires_at)
    : "No expiry date";

  return (
    <GlassCard className="rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle icon={MailPlus} title={request.email} />
          <p className="mt-2 text-sm text-muted-foreground">
            Created {formatDashboardDate(request.created_at)}
          </p>
        </div>
        <StatusPill icon={Clock3} label="Invited" tone="amber" />
      </div>
      {request.invite_note && (
        <p className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
          {request.invite_note}
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailItem label="Expires" value={expiresAt} />
        <DetailItem label="Status" value="Waiting for registration form" />
      </div>
    </GlassCard>
  );
}

const getPrincipalUploadedDocuments = (
  request: PrincipalRegistrationRequest,
): PrincipalUploadedDocument[] => [
  {
    label: "Profile ဓာတ်ပုံ",
    bucket: "application-nrc-docs",
    path: request.profile_photo_url,
    documentType: "profilePhoto",
    buttonLabel: "View",
  },
  {
    label: "NRC ရှေ့ဘက်",
    bucket: "application-nrc-docs",
    path: request.nrc_front_url,
    documentType: "nrcFront",
    buttonLabel: "View",
    required: true,
  },
  {
    label: "NRC နောက်ဘက်",
    bucket: "application-nrc-docs",
    path: request.nrc_back_url,
    documentType: "nrcBack",
    buttonLabel: "View",
    required: true,
  },
  {
    label: "ပညာအရည်အချင်းလက်မှတ်",
    bucket: "application-school-docs",
    path: request.degree_certificate_url,
    documentType: "degreeCertificate",
    buttonLabel: "Open PDF",
    required: true,
  },
  {
    label: "သင်ကြားခွင့် / လုပ်ငန်းလိုင်စင်လက်မှတ်",
    bucket: "application-school-docs",
    path: request.teaching_license_url,
    documentType: "teachingLicense",
    buttonLabel: "Open PDF",
    required: true,
  },
  {
    label: "Appointment Letter",
    bucket: "application-school-docs",
    path: request.appointment_letter_url,
    documentType: "appointmentLetter",
    buttonLabel: "Open PDF",
    optional: true,
  },
  {
    label: "Resume",
    bucket: "application-school-docs",
    path: request.resume_url,
    documentType: "resume",
    buttonLabel: "Open PDF",
    optional: true,
  },
  {
    label: "Recommendation Letter",
    bucket: "application-school-docs",
    path: request.recommendation_letter_url,
    documentType: "recommendationLetter",
    buttonLabel: "Open PDF",
    optional: true,
  },
].filter((document) => !document.optional || Boolean(document.path));

function PrincipalReviewCard({
  request,
  schoolName,
  schoolType,
  schoolAddress,
  regionName,
  townshipName,
  reviewing,
  rejecting,
  rejectionReason,
  onRejectingChange,
  onRejectionReasonChange,
  onApprove,
  onReject,
  onOpenDocument,
}: {
  request: PrincipalRegistrationRequest;
  schoolName: string;
  schoolType: string;
  schoolAddress: string | null;
  regionName: string | null;
  townshipName: string | null;
  reviewing: boolean;
  rejecting: boolean;
  rejectionReason: string;
  onRejectingChange: (active: boolean) => void;
  onRejectionReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onOpenDocument: (document: PrincipalUploadedDocument) => void;
}) {
  const documents = getPrincipalUploadedDocuments(request);
  const hasEmergencyContact = Boolean(
    request.emergency_contact_name ||
      request.emergency_contact_relationship ||
      request.emergency_contact_phone,
  );

  return (
    <GlassCard className="rounded-[2rem] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <SectionTitle
              icon={Eye}
              title={request.full_name_mm || request.full_name_en || request.email}
            />
            <StatusPill icon={Clock3} label="Pending Review" tone="amber" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Submitted {formatDashboardDate(request.updated_at || request.created_at)}
          </p>
          {request.invite_note && (
            <p className="mt-3 max-w-2xl rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
              {request.invite_note}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="aqua-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onApprove}
            disabled={reviewing}
          >
            {reviewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve
          </button>
          <button
            type="button"
            className="glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-destructive disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onRejectingChange(!rejecting)}
            disabled={reviewing}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
          <SectionTitle icon={UserCheck} title="ကိုယ်ရေးအချက်အလက်" />
          <div className="mt-4 grid gap-3">
            <DetailItem label="မြန်မာအမည်" value={request.full_name_mm} />
            <DetailItem label="English Name" value={request.full_name_en} />
            <DetailItem label="Email" value={request.email} />
            <DetailItem label="Phone" value={request.phone} />
            <DetailItem label="Date of Birth" value={formatDashboardDate(request.date_of_birth)} />
            <DetailItem label="Gender" value={request.gender} />
            <DetailItem label="NRC" value={request.nrc_number} />
            <DetailItem
              label="Region / Township"
              value={`${regionName || "No data available"} / ${townshipName || "No data available"}`}
            />
            <DetailItem label="Address" value={request.residential_address} />
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
          <SectionTitle icon={GraduationCap} title="ပညာအရည်အချင်းနှင့် အတွေ့အကြုံ" />
          <div className="mt-4 grid gap-3">
            <DetailItem label="Highest Education" value={request.highest_education} />
            <DetailItem
              label="Teaching Experience"
              value={formatYearCount(request.years_of_teaching_experience)}
            />
            <DetailItem
              label="Management Experience"
              value={formatYearCount(request.years_of_management_experience)}
            />
            <DetailItem label="Previous School" value={request.previous_school} />
            {request.major && <DetailItem label="Major" value={request.major} />}
            {request.current_position && (
              <DetailItem label="Current Position" value={request.current_position} />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
          <SectionTitle icon={School} title="School Assignment" />
          <div className="mt-4 grid gap-3">
            <DetailItem label="School Name" value={schoolName} />
            <DetailItem label="School Type" value={schoolType} />
            <DetailItem label="School Address" value={schoolAddress} />
            <DetailItem label="Review Status" value="Waiting for School Admin approval" />
          </div>
        </div>
      </div>

      {hasEmergencyContact && (
        <div className="mt-5 rounded-3xl border border-border/60 bg-muted/20 p-4">
          <SectionTitle icon={ShieldCheck} title="Emergency Contact" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <DetailItem label="Name" value={request.emergency_contact_name} />
            <DetailItem label="Relationship" value={request.emergency_contact_relationship} />
            <DetailItem label="Phone" value={request.emergency_contact_phone} />
          </div>
        </div>
      )}

      <div className="mt-5 rounded-3xl border border-border/60 bg-muted/20 p-4">
        <SectionTitle icon={FileText} title="စာရွက်စာတမ်းများ" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <div
              key={`${request.id}-${document.documentType}`}
              className="rounded-2xl border border-border/50 bg-background/25 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {document.required ? "Required Document" : "Optional Document"}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6">{document.label}</p>
                </div>
                {document.required && (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                    Required
                  </span>
                )}
              </div>

              <div className="mt-3">
                {document.path ? (
                  <button
                    type="button"
                    className="glass-panel inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-primary transition hover:glow-ring"
                    onClick={() => onOpenDocument(document)}
                  >
                    <Eye className="h-4 w-4" />
                    {document.buttonLabel}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "inline-flex rounded-xl px-3 py-2 text-xs font-bold",
                      document.required
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {document.required ? "Missing" : "မတင်ထားပါ"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {rejecting && (
        <div className="mt-5 rounded-3xl border border-destructive/30 bg-destructive/10 p-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-destructive">Rejection Reason</span>
            <textarea
              className="aqua-input min-h-24 w-full rounded-2xl px-4 py-3 text-sm"
              value={rejectionReason}
              onChange={(event) => onRejectionReasonChange(event.target.value)}
              placeholder="Explain why this Principal registration is rejected."
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="glass-panel rounded-2xl px-4 py-2 text-sm font-bold"
              onClick={() => onRejectingChange(false)}
              disabled={reviewing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aqua-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onReject}
              disabled={reviewing || !rejectionReason.trim()}
            >
              {reviewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Confirm Reject
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function PrincipalActiveCard({
  principal,
  schoolName,
}: {
  principal: ActivePrincipal | null;
  schoolName: string;
}) {
  if (!principal) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No active Principal"
        description={`No approved Principal account is connected to ${schoolName} yet.`}
      />
    );
  }

  return (
    <GlassCard className="rounded-[2rem] p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="theme-icon-tile h-16 w-16 rounded-3xl">
          {principal.avatar_url ? (
            <img
              src={principal.avatar_url}
              alt=""
              className="h-full w-full rounded-3xl object-cover"
            />
          ) : (
            <UserCheck className="h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-foreground">
              {principal.full_name || "Active Principal"}
            </h3>
            <StatusPill icon={CheckCircle2} label="Active" tone="emerald" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Principal for {schoolName}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <DetailItem label="Email" value={principal.email} />
        <DetailItem label="Phone" value={principal.phone} />
        <DetailItem label="Approved Since" value={formatDashboardDate(principal.created_at)} />
      </div>
    </GlassCard>
  );
}

function StatusPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: "amber" | "emerald";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
        tone === "emerald"
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">
        {value || "No data available"}
      </p>
    </div>
  );
}

function formatDashboardDate(value?: string | null) {
  if (!value) return "No data available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatYearCount(value?: number | null) {
  if (value === null || value === undefined) return "No data available";
  return `${value} ${value === 1 ? "year" : "years"}`;
}

export function AttendancePage() {
  return (
    <div className="space-y-4">
      <SectionHeader
        icon={ClipboardCheck}
        title="Attendance"
        description="Today's, weekly, monthly, and class attendance data will be shown here."
      />
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
      <SectionHeader
        icon={BookOpen}
        title="Academic"
        description="GPA, pass/fail rate, and subject performance will connect to real academic records later."
      />
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
      <SectionHeader
        icon={FileText}
        title="Report Cards"
        description="Search, preview, and PDF download UI is ready for backend integration."
      />
      <GlassCard className="rounded-[2rem] p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="aqua-input flex-1 rounded-2xl px-4 py-3 text-sm"
            placeholder="Search Student"
            disabled
          />
          <button
            className="glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
            disabled
          >
            <Search className="h-4 w-4" />
            Preview Report Card
          </button>
          <button
            className="aqua-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
            disabled
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
        <EmptyState
          icon={FileText}
          title="No report card data available"
          description="Student report cards will appear after academic records are connected."
        />
      </GlassCard>
    </div>
  );
}

export function ReportsPage() {
  return (
    <div className="space-y-4">
      <SectionHeader
        icon={FileBarChart}
        title="Reports"
        description="Report generation buttons are UI-only until report services are connected."
      />
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
      <SectionHeader
        icon={Megaphone}
        title="Instructions"
        description="School Admin can send instructions to Principal after backend integration."
      />
      <GlassCard className="rounded-[2rem] p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <input
            className="aqua-input rounded-2xl px-4 py-3 text-sm"
            placeholder="Instruction"
            disabled
          />
          <input
            className="aqua-input rounded-2xl px-4 py-3 text-sm"
            placeholder="Deadline"
            disabled
          />
          <input
            className="aqua-input rounded-2xl px-4 py-3 text-sm"
            placeholder="Priority"
            disabled
          />
        </div>
        <div className="mt-4">
          <EmptyState
            icon={ListChecks}
            title="No instructions available"
            description="Instruction title, status, completed, pending, and in-progress records are not connected yet."
          />
        </div>
      </GlassCard>
    </div>
  );
}

export function DocumentsPage() {
  const access = useSchoolAdminAccess();

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Download}
        title="Documents"
        description="Approved school documents are shown without fabricated records."
      />
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
      <SectionHeader
        icon={BarChart3}
        title="Analytics"
        description="Charts are intentionally empty until real analytics queries are added."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartEmptyCard
          icon={LineChart}
          title="Student Growth"
          description="No student growth data available."
        />
        <ChartEmptyCard
          icon={ClipboardCheck}
          title="Attendance Trend"
          description="No attendance trend data available."
        />
        <ChartEmptyCard
          icon={BookOpen}
          title="Academic Trend"
          description="No academic trend data available."
        />
        <ChartEmptyCard
          icon={PieChart}
          title="Gender Ratio"
          description="No gender ratio data available."
        />
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-4 pb-8">
      <SectionHeader
        icon={Settings}
        title="Settings"
        description="Settings UI is ready; persistence will be connected to backend later."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EmptyPanel icon={School} title="School Settings" />
        <EmptyPanel icon={Activity} title="Theme" />
        <EmptyPanel icon={Bell} title="Notification" />
        <EmptyPanel icon={Lock} title="Password" />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  live,
  error,
  loading = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  live: boolean;
  error?: string;
  loading?: boolean;
}) {
  return (
    <GlassCard className="rounded-[2rem] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="theme-icon-tile h-12 w-12 rounded-2xl">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
            live
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "border-border text-muted-foreground",
          )}
          title={error || undefined}
        >
          {loading ? "Loading" : live ? "Live" : "No data"}
        </span>
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">
        {loading ? "..." : formatMetricNumber(value)}
      </p>
      <div
        className={cn(
          "mt-4 h-10 rounded-2xl border bg-muted/20",
          live ? "border-primary/20" : "border-dashed border-border/70",
        )}
      />
    </GlassCard>
  );
}

function formatMetricNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function ChartEmptyCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
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

function ManagementSummaryCard({
  icon: Icon,
  title,
  value,
  loading,
  live,
  error,
  emptyDescription,
}: {
  icon: LucideIcon;
  title: string;
  value: number;
  loading: boolean;
  live: boolean;
  error?: string;
  emptyDescription: string;
}) {
  return (
    <GlassCard className="rounded-[2rem] p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionTitle icon={Icon} title={title} />
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            live
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "border-border text-muted-foreground",
          )}
          title={error || undefined}
        >
          {loading ? "Loading..." : live ? "Live" : "No data"}
        </span>
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : value > 0 ? (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-sm font-semibold text-muted-foreground">Current total</p>
            <p className="mt-2 text-4xl font-bold text-foreground">{formatMetricNumber(value)}</p>
          </div>
        ) : (
          <EmptyState icon={Icon} title="No data available" description={emptyDescription} />
        )}
      </div>
    </GlassCard>
  );
}

function RecentNotificationsCard({
  notifications,
  loading,
  error,
}: {
  notifications: NotificationPreview[];
  loading: boolean;
  error?: string;
}) {
  return (
    <GlassCard className="rounded-[2rem] p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionTitle icon={Bell} title="Recent Notifications" />
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            !error && notifications.length > 0
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "border-border text-muted-foreground",
          )}
          title={error || undefined}
        >
          {loading ? "Loading..." : !error && notifications.length > 0 ? "Live" : "No data"}
        </span>
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-border/70 bg-muted/20 p-3"
              >
                <p className="line-clamp-1 text-sm font-semibold">
                  {notification.title || "Notification"}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {notification.message || "-"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No data available"
            description="No recent notifications for this school/admin."
          />
        )}
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
      <p className="mt-4 text-sm text-muted-foreground">
        {available
          ? "Document path exists in the approved school record."
          : "No document available"}
      </p>
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
        <textarea
          className="aqua-input min-h-24 w-full rounded-2xl px-4 py-3 text-sm"
          value={value}
          readOnly
          placeholder="No data available"
        />
      ) : (
        <input
          className="aqua-input w-full rounded-2xl px-4 py-3 text-sm"
          value={value}
          readOnly
          placeholder="No data available"
        />
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

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
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

function IconButton({
  label,
  icon: Icon,
  disabled = false,
}: {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}) {
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
