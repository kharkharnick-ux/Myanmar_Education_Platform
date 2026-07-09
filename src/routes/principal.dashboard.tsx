import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Clock3, Loader2, LogIn, ShieldCheck, XCircle } from "lucide-react";
import { GlassCard } from "@/components/ui-kit/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { getPrincipalDashboardAccess } from "@/lib/api/principal-account.functions";

type PrincipalDashboardState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; message: string }
  | { status: "pending"; message: string }
  | { status: "rejected"; message: string }
  | {
      status: "approved";
      fullName: string;
      email: string;
      schoolName: string;
    };

export const Route = createFileRoute("/principal/dashboard")({
  head: () => ({
    meta: [
      { title: "Principal Dashboard - Myanmar Education Platform" },
      {
        name: "description",
        content: "Principal dashboard placeholder for approved Principal accounts.",
      },
    ],
  }),
  component: PrincipalDashboardRoute,
});

function PrincipalDashboardRoute() {
  const [state, setState] = useState<PrincipalDashboardState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    const loadPrincipalAccess = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session?.access_token) {
          setState({ status: "signed-out" });
          return;
        }

        const result = await getPrincipalDashboardAccess({
          data: { accessToken: session.access_token },
        });

        if (!active) return;

        if (result.status === "approved") {
          setState({
            status: "approved",
            fullName: result.profile.fullName,
            email: result.profile.email,
            schoolName: result.school.name,
          });
          return;
        }

        if (result.status === "rejected") {
          setState({ status: "rejected", message: result.message });
          return;
        }

        if (result.status === "pending") {
          setState({ status: "pending", message: result.message });
          return;
        }

        setState({
          status: "error",
          message: "Principal account အချက်အလက် မတွေ့ရှိပါ။",
        });
      } catch (error) {
        if (!active) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Principal dashboard ကို ယာယီဖွင့်မရပါ။ ပြန်စမ်းကြည့်ပါ။",
        });
      }
    };

    loadPrincipalAccess();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="aqua-page grid min-h-screen place-items-center px-4 py-8">
      <GlassCard className="w-full max-w-xl rounded-[2rem] p-8 text-center">
        {state.status === "loading" && (
          <PrincipalDashboardStatus
            icon={<Loader2 className="h-9 w-9 animate-spin" />}
            title="Principal Dashboard"
            message="Principal account ကို စစ်ဆေးနေပါသည်..."
          />
        )}

        {state.status === "signed-out" && (
          <PrincipalDashboardStatus
            icon={<LogIn className="h-9 w-9" />}
            title="Login လိုအပ်ပါသည်"
            message="Principal dashboard ကိုအသုံးပြုရန် login ဝင်ပါ။"
          >
            <Link
              to="/auth"
              className="aqua-button mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              Login ဝင်ရန်
            </Link>
          </PrincipalDashboardStatus>
        )}

        {state.status === "approved" && (
          <PrincipalDashboardStatus
            icon={<CheckCircle2 className="h-9 w-9" />}
            title="Principal Dashboard"
            message="Principal dashboard ကို ဆက်လက်တည်ဆောက်နေပါသည်။"
          >
            <div className="mt-5 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-left">
              <p className="text-sm font-semibold text-muted-foreground">Principal</p>
              <p className="mt-1 text-base font-bold">{state.fullName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{state.email}</p>
              <p className="mt-4 text-sm font-semibold text-muted-foreground">School</p>
              <p className="mt-1 text-base font-bold">{state.schoolName}</p>
            </div>
          </PrincipalDashboardStatus>
        )}

        {state.status === "pending" && (
          <PrincipalDashboardStatus
            icon={<Clock3 className="h-9 w-9" />}
            title="စောင့်ဆိုင်းနေပါသည်"
            message={state.message}
          />
        )}

        {state.status === "rejected" && (
          <PrincipalDashboardStatus
            icon={<XCircle className="h-9 w-9" />}
            title="Principal registration ကို ငြင်းပယ်ထားပါသည်"
            message={state.message}
          />
        )}

        {state.status === "error" && (
          <PrincipalDashboardStatus
            icon={<ShieldCheck className="h-9 w-9" />}
            title="Principal Dashboard"
            message={state.message}
          >
            <Link
              to="/"
              className="glass-panel mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-bold hover:glow-ring"
            >
              Home page သို့သွားရန်
            </Link>
          </PrincipalDashboardStatus>
        )}
      </GlassCard>
    </main>
  );
}

function PrincipalDashboardStatus({
  icon,
  title,
  message,
  children,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="theme-icon-tile-strong mx-auto mb-4 h-16 w-16 rounded-3xl">{icon}</div>
      <h1 className="text-2xl font-bold glow-text">{title}</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}
