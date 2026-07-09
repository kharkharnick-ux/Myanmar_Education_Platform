import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  School,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { getSchoolImageUrl } from "@/lib/school-images";
import { getPrincipalInvite } from "@/lib/api/principal-account.functions";

type InviteState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      request: { id: string; email: string; note: string };
      school: {
        id: string;
        name: string;
        type: string | null;
        level: string | null;
        gradeFrom: string | null;
        gradeTo: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        logoUrl: string | null;
        region: string | null;
        township: string | null;
      };
    };

export const Route = createFileRoute("/principal/register")({
  head: () => ({
    meta: [
      { title: "Principal Invitation - Myanmar Education Platform" },
      {
        name: "description",
        content: "Review your invited Principal registration information.",
      },
    ],
  }),
  component: PrincipalInvitationPage,
});

function PrincipalInvitationPage() {
  const routeLocation = useLocation();
  const isFormRoute = routeLocation.pathname === "/principal/register/form";
  const [invite, setInvite] = useState<InviteState>({ status: "loading" });
  const [logoPreview, setLogoPreview] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  useEffect(() => {
    if (isFormRoute) return;

    const loadInvite = async () => {
      if (!token) {
        setInvite({ status: "error", message: "Principal invite token is missing." });
        return;
      }

      try {
        const result = await getPrincipalInvite({ data: { token } });
        if (!result.school) throw new Error("Invited school was not found.");
        setInvite({
          status: "ready",
          request: result.request,
          school: result.school,
        });
      } catch (error) {
        setInvite({
          status: "error",
          message: error instanceof Error ? error.message : "Principal invite link is invalid.",
        });
      }
    };

    loadInvite();
  }, [isFormRoute, token]);

  useEffect(() => {
    if (isFormRoute) return;
    if (invite.status !== "ready") return;
    getSchoolImageUrl(invite.school.logoUrl).then(setLogoPreview);
  }, [invite, isFormRoute]);

  if (isFormRoute) return <Outlet />;

  if (invite.status === "loading") {
    return (
      <CenteredState
        icon={<Loader2 className="h-8 w-8 animate-spin" />}
        title="Checking invite link..."
      />
    );
  }

  if (invite.status === "error") {
    return (
      <CenteredState
        icon={<ShieldCheck className="h-8 w-8" />}
        title="Invite unavailable"
        message={invite.message}
      />
    );
  }

  const gradeRange =
    [invite.school.gradeFrom, invite.school.gradeTo].filter(Boolean).join(" to ") || "-";
  const location =
    [invite.school.region, invite.school.township].filter(Boolean).join(" / ") || "-";

  return (
    <main className="aqua-page min-h-screen px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Link
          to="/"
          className="glass-panel inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        <section className="aqua-card overflow-hidden rounded-[2rem] p-0">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="aqua-panel rounded-none border-0 border-b border-primary/10 p-5 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="mb-6 flex items-center gap-3">
                <Logo />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Myanmar Education Platform
                  </p>
                  <h1 className="text-2xl font-bold glow-text">Principal Invitation</h1>
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-5 sm:p-6">
                <div className="mb-4 grid h-20 w-20 place-items-center overflow-hidden rounded-3xl border border-border bg-background/40">
                  {logoPreview ? (
                    <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <School className="h-9 w-9 text-primary" />
                  )}
                </div>
                <h2 className="text-xl font-bold">{invite.school.name}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  You have been invited to become the Principal of this school.
                </p>
                {invite.request.note && (
                  <p className="mt-3 rounded-2xl bg-background/40 p-3 text-sm leading-6">
                    {invite.request.note}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-6 lg:p-8">
              <SchoolInfo
                icon={<School className="h-4 w-4" />}
                label="School type"
                value={invite.school.type || "-"}
              />
              <SchoolInfo
                icon={<FileText className="h-4 w-4" />}
                label="Grade range"
                value={gradeRange}
              />
              <SchoolInfo
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={invite.school.address || location}
              />
              <SchoolInfo
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={invite.school.phone || "-"}
              />
              <SchoolInfo
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={invite.school.email || "-"}
              />

              <Link
                to="/principal/register/form"
                search={{ token }}
                className="aqua-button mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99]"
              >
                <UserRound className="h-4 w-4" />
                Start Principal Registration
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function CenteredState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <main className="aqua-page grid min-h-screen place-items-center px-4 py-10">
      <div className="aqua-card max-w-lg p-8 text-center">
        <div className="theme-icon-tile-strong mx-auto mb-4 h-14 w-14 rounded-2xl">{icon}</div>
        <h1 className="text-2xl font-bold glow-text">{title}</h1>
        {message && <p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>}
      </div>
    </main>
  );
}

function SchoolInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="glass-panel flex items-center gap-3 rounded-2xl p-4">
      <div className="theme-icon-tile grid h-9 w-9 shrink-0 place-items-center rounded-xl">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
