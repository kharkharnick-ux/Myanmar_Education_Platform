import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";
import { activateApprovedSchoolAdminRegistration } from "@/lib/api/school-admin-account.functions";

const INVALID_PASSWORD_SETUP_LINK_MESSAGE =
  "Password setup link သက်တမ်းကုန်သွားပါသည် သို့မဟုတ် မမှန်ကန်ပါ။ Password setup link အသစ်တောင်းပါ။";

export const Route = createFileRoute("/auth/setup-password")({
  head: () => ({
    meta: [{ title: "Create Password — Myanmar Education ERP" }],
  }),
  component: SetupPasswordPage,
});

function SetupPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    let hasResolvedSession = false;
    const acceptedEvents = new Set(["PASSWORD_RECOVERY", "SIGNED_IN", "TOKEN_REFRESHED"]);

    const cleanUrl = () => {
      window.history.replaceState(null, "", "/auth/setup-password");
    };

    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (!session?.user?.email) return false;
      hasResolvedSession = true;
      setEmail(session.user.email);
      setError("");
      setLoadingSession(false);
      cleanUrl();
      return true;
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted || !acceptedEvents.has(event)) return;
      applySession(session);
    });

    const preparePasswordSetupSession = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        const {
          data: { session: detectedSession },
          error: detectedSessionError,
        } = await supabase.auth.getSession();

        if (detectedSessionError) throw detectedSessionError;
        if (applySession(detectedSession)) return;

        if (code && !hasResolvedSession) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken && !hasResolvedSession) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (applySession(session)) return;

        await new Promise((resolve) => setTimeout(resolve, 1200));
        if (hasResolvedSession) return;

        const {
          data: { session: lateSession },
          error: lateSessionError,
        } = await supabase.auth.getSession();

        if (lateSessionError) throw lateSessionError;
        if (!applySession(lateSession)) {
          throw new Error(INVALID_PASSWORD_SETUP_LINK_MESSAGE);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : INVALID_PASSWORD_SETUP_LINK_MESSAGE);
        setLoadingSession(false);
      } finally {
        if (isMounted && hasResolvedSession) setLoadingSession(false);
      }
    };

    preparePasswordSetupSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!password) nextErrors.password = "Password is required.";
    else if (password.length < 8) nextErrors.password = "Password must be at least 8 characters.";

    if (!confirmPassword) nextErrors.confirmPassword = "Confirm Password is required.";
    else if (password !== confirmPassword) nextErrors.confirmPassword = "Password and Confirm Password must match.";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error("Unable to finalize approval. Please open the setup link again.");

      await activateApprovedSchoolAdminRegistration({
        data: { accessToken: session.access_token },
      });

      await supabase.auth.signOut();
      navigate({
        to: "/auth",
        search: { password_created: "1" },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="aqua-page grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-3">
          <Logo />
          <span className="text-sm font-bold">Myanmar Education ERP</span>
        </Link>

        <form onSubmit={handleSubmit} className="aqua-card space-y-5 p-6 sm:p-8">
          <div className="text-center">
            <div className="theme-icon-tile-strong mx-auto mb-4 h-14 w-14 rounded-2xl">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold glow-text">Create Password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set your password to activate your approved School Admin account.
            </p>
          </div>

          {loadingSession ? (
            <div className="glass-panel flex items-center justify-center gap-2 rounded-2xl p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking invitation link...
            </div>
          ) : (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Email</span>
                <input
                  value={email}
                  readOnly
                  className="aqua-input w-full rounded-xl px-4 py-3 text-sm opacity-80"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">New Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="aqua-input w-full rounded-xl px-4 py-3 pr-12 text-sm"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent/40"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Confirm Password</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="aqua-input w-full rounded-xl px-4 py-3 pr-12 text-sm"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent/40"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </label>

              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || Boolean(error && !email)}
                className="aqua-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Create Password
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
