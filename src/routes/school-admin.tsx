import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock3, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import {
  SchoolAdminDashboardProvider,
  SchoolAdminShell,
  type SchoolAdminAccess,
} from "@/components/layout/school-admin-dashboard";

type AccessState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "pending"; message: string }
  | SchoolAdminAccess;

type SchoolRow = {
  id: string;
  school_name: string;
  school_type: string;
  grade_from: string;
  grade_to: string;
  address: string | null;
  school_phone: string | null;
  school_email: string | null;
  website: string | null;
  document_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  regions?: { name: string | null } | null;
  townships?: { name: string | null } | null;
};

export const Route = createFileRoute("/school-admin")({
  head: () => ({ meta: [{ title: "School Admin — Myanmar EDU" }] }),
  component: SchoolAdminLayoutRoute,
});

function SchoolAdminLayoutRoute() {
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setAccess({ status: "signed-out" });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, role, status")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== "school_admin" || profile.status !== "active") {
        setAccess({
          status: "pending",
          message: "သင့် School Admin account ကို အတည်ပြုထားခြင်း မရှိသေးပါ။",
        });
        return;
      }

      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select(
          "id, school_name, school_type, grade_from, grade_to, address, school_phone, school_email, website, document_url, logo_url, cover_image_url, regions(name), townships(name)",
        )
        .eq("school_admin_id", user.id)
        .eq("status", "approved")
        .maybeSingle();

      if (schoolError || !school) {
        setAccess({
          status: "pending",
          message: "အတည်ပြုထားသော ကျောင်းမှတ်တမ်း မရှိသေးပါ။",
        });
        return;
      }

      const approvedSchool = school as SchoolRow;
      setAccess({
        status: "approved",
        profile: {
          full_name: profile.full_name || user.email?.split("@")[0] || "",
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          avatar_url: profile.avatar_url,
        },
        school: {
          id: approvedSchool.id,
          school_name: approvedSchool.school_name,
          school_type: approvedSchool.school_type,
          grade_from: approvedSchool.grade_from,
          grade_to: approvedSchool.grade_to,
          address: approvedSchool.address,
          phone: approvedSchool.school_phone,
          email: approvedSchool.school_email,
          website: approvedSchool.website,
          region_name: approvedSchool.regions?.name || null,
          township_name: approvedSchool.townships?.name || null,
          document_url: approvedSchool.document_url,
          logo_url: approvedSchool.logo_url,
          cover_image_url: approvedSchool.cover_image_url,
        },
      });
    };

    checkAccess();
  }, []);

  useEffect(() => {
    if (access.status === "approved" && location.pathname === "/school-admin") {
      navigate({ to: "/school-admin/dashboard", replace: true });
    }
  }, [access.status, location.pathname, navigate]);

  if (access.status === "loading") {
    return (
      <main className="aqua-page grid min-h-screen place-items-center p-4">
        <GlassCard className="max-w-md rounded-[2rem] p-8 text-center">
          <Clock3 className="mx-auto mb-4 h-8 w-8 animate-pulse text-primary" />
          <p className="font-semibold">School Admin access စစ်ဆေးနေပါသည်...</p>
        </GlassCard>
      </main>
    );
  }

  if (access.status === "signed-out") {
    return (
      <main className="aqua-page grid min-h-screen place-items-center p-4">
        <GlassCard className="max-w-md rounded-[2rem] p-8 text-center">
          <LogIn className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">Login လိုအပ်ပါသည်</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            School Admin Dashboard ကို အသုံးပြုရန် အတည်ပြုထားသော account ဖြင့် ဝင်ရောက်ပါ။
          </p>
          <Link
            to="/auth"
            className="aqua-button mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Login ဝင်ရန်
          </Link>
        </GlassCard>
      </main>
    );
  }

  if (access.status === "pending") {
    return (
      <main className="aqua-page grid min-h-screen place-items-center p-4">
        <GlassCard className="max-w-xl rounded-[2rem] p-8 text-center">
          <Clock3 className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">အတည်ပြုချက်ကို စောင့်ဆိုင်းနေသည်</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{access.message}</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Super Admin အတည်ပြုပြီးမှ School Admin Dashboard ကို အသုံးပြုနိုင်ပါမည်။
          </p>
          <Link to="/" className="glass-panel mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-bold hover:glow-ring">
            ပင်မစာမျက်နှာသို့
          </Link>
        </GlassCard>
      </main>
    );
  }

  return (
    <SchoolAdminDashboardProvider access={access}>
      <SchoolAdminShell>
        <Outlet />
      </SchoolAdminShell>
    </SchoolAdminDashboardProvider>
  );
}
