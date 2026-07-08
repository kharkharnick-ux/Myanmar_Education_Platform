import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Sparkles, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, School, UserCog, CreditCard, BarChart3,
  Megaphone, LifeBuoy, Activity, Settings,
} from "lucide-react";
import { ProfileDrawer } from "./ProfileDrawer";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/super-admin", icon: LayoutDashboard, label: "ပင်မစာမျက်နှာ" },
  { to: "/super-admin/school-admin-applications", icon: FileText, label: "School Admin Applications" },
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { theme, mounted, toggle } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: profile, refetch: refetchProfile } = useQuery({
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
    setOpen(false);
    navigate({
      to: "/",
    });
  }

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 p-3">
        <div className="aqua-card flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="theme-icon-tile-strong h-9 w-9 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold glow-text">Myanmar EDU</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="glass-panel p-2 rounded-lg" aria-label="Theme">
              {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <div className="h-4 w-4" />}
            </button>
            <button onClick={() => setOpen(true)} className="glass-panel p-2 rounded-lg" aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative ml-auto h-full w-80 max-w-[85vw] p-3">
            <div className="aqua-card h-full flex flex-col p-3">
              {/* Profile Header in Mobile Menu */}
              <div className="flex items-start justify-between mb-4">
                <button 
                  onClick={() => { setOpen(false); setProfileOpen(true); }}
                  className="glass-panel flex flex-1 items-center gap-3 p-3 rounded-xl text-left mr-2"
                >
                  <div className="theme-icon-tile-strong h-10 w-10 rounded-full text-xs font-bold overflow-hidden shadow-inner">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (profile?.full_name || "SA").substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{profile?.full_name || "System Owner"}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{profile?.email || "admin@myanmar-edu"}</div>
                  </div>
                </button>
                <button onClick={() => setOpen(false)} className="glass-panel p-3 rounded-xl">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto">
                <ul className="space-y-1">
                  {NAV.map((item) => {
                    const active = item.to === "/super-admin" ? pathname === "/super-admin" : pathname.startsWith(item.to);
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <Link to={item.to} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", active ? "theme-active-surface" : "text-muted-foreground hover:bg-accent/35")}>
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>
              
              {/* Branding and Actions in Mobile Footer */}
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="theme-icon-tile-strong h-8 w-8 rounded-lg">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">Myanmar EDU</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Super Admin ERP</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="glass-panel w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>

              <ProfileDrawer 
                open={profileOpen} 
                onOpenChange={setProfileOpen} 
                onProfileUpdated={() => refetchProfile()}
                user={{ 
                  full_name: profile?.full_name || "System Owner", 
                  email: profile?.email || "admin@myanmar-edu", 
                  role: profile?.role || "super_admin",
                  avatar_url: profile?.avatar_url,
                  phone: profile?.phone,
                  created_at: profile?.created_at
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
