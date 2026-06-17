import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, School, UserCog, CreditCard, BarChart3,
  Megaphone, LifeBuoy, Activity, Settings, Moon, Sun, LogOut, Sparkles,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ProfileDrawer } from "./ProfileDrawer";

const NAV = [
  { to: "/super-admin", icon: LayoutDashboard, label: "ပင်မစာမျက်နှာ" },
  { to: "/super-admin/applications", icon: FileText, label: "ကျောင်းလျှောက်လွှာများ" },
  { to: "/super-admin/schools", icon: School, label: "ကျောင်းများ" },
  { to: "/super-admin/school-admins", icon: UserCog, label: "ကျောင်း Admin များ" },
  { to: "/super-admin/payments", icon: CreditCard, label: "ငွေပေးချေမှုများ" },
  { to: "/super-admin/reports", icon: BarChart3, label: "အစီရင်ခံစာများ" },
  { to: "/super-admin/announcements", icon: Megaphone, label: "ကြေညာချက်များ" },
  { to: "/super-admin/support", icon: LifeBuoy, label: "အကူအညီတောင်းခံမှုများ" },
  { to: "/super-admin/activity", icon: Activity, label: "လုပ်ဆောင်မှုမှတ်တမ်းများ" },
  { to: "/super-admin/settings", icon: Settings, label: "စနစ်ဆက်တင်များ" },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, mounted, toggle } = useTheme();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  async function handleLogout() {
    await supabase.auth.signOut();

    navigate({
      to: "/",
    });
  }

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-72 shrink-0 flex-col gap-4 p-4">
      {/* Profile Section at the Top */}
      <div className="glass-strong p-3">
        <button 
          onClick={() => setProfileOpen(true)}
          className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition-colors text-left"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.75_0.20_225)] to-[oklch(0.55_0.25_260)] text-xs font-bold text-white overflow-hidden shadow-inner">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile?.full_name || "SA").substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{profile?.full_name || "System Owner"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{profile?.email || "admin@myanmar-edu"}</div>
          </div>
        </button>
      </div>

      <ProfileDrawer 
        open={profileOpen} 
        onOpenChange={setProfileOpen} 
        user={{ ...userProfile, avatar_url: profile?.avatar_url, full_name: profile?.full_name || "System Owner", email: profile?.email || "admin@myanmar-edu" }} 
      />

      <nav className="glass flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              item.to === "/super-admin"
                ? pathname === "/super-admin"
                : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                    active
                      ? "bg-gradient-to-r from-[oklch(0.70_0.20_225/0.25)] to-[oklch(0.55_0.25_260/0.15)] text-foreground glow-ring"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                    active && "text-[var(--neon)]")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Branding & Controls at the Bottom */}
      <div className="glass-strong p-3 space-y-3">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.75_0.22_225)] to-[oklch(0.55_0.25_260)] glow-ring">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold glow-text">Myanmar EDU</div>
            <div className="truncate text-[10px] text-muted-foreground uppercase tracking-tight">Super Admin ERP</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggle}
            className="glass flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs hover:glow-ring transition-all"
            aria-label="Toggle theme"
          >
            {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <div className="h-4 w-4" />}
            <span>{mounted ? (theme === "dark" ? "Light" : "Dark") : "Theme"}</span>
          </button>
          <button
            onClick={handleLogout}
            className="glass flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs hover:glow-ring transition-all text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>ထွက်ရန်</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

const userProfile = {
  full_name: "System Owner",
  email: "admin@myanmar-edu",
  role: "Super Admin",
  phone: "",
  created_at: ""
};
