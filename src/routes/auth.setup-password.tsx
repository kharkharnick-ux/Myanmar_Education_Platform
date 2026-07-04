import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MailPlus, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";
import {
  activateApprovedSchoolAdminRegistration,
  requestSchoolAdminPasswordSetupLink,
} from "@/lib/api/school-admin-account.functions";

const INVALID_PASSWORD_SETUP_LINK_MESSAGE =
  "Password setup link သက်တမ်းကုန်သွားပါသည် သို့မဟုတ် မမှန်ကန်ပါ။ Password setup link အသစ်တောင်းပါ။";

const myanmarDigits = "၀၁၂၃၄၅၆၇၈၉";

const toEnglishDigits = (value = "") =>
  value.replace(/[၀-၉]/g, (digit) => myanmarDigits.indexOf(digit).toString());

const sanitizeNrcLast6 = (value: string) =>
  toEnglishDigits(value)
    .replace(/[^0-9]/g, "")
    .slice(0, 6);

export const Route = createFileRoute("/auth/setup-password")({
  head: () => ({
    meta: [
      { title: "Set your password - Myanmar Education Platform" },
      {
        name: "description",
        content:
          "Set your password for your approved Myanmar Education Platform School Admin account.",
      },
      { property: "og:title", content: "Set your password - Myanmar Education Platform" },
    ],
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
  const [resendEmail, setResendEmail] = useState("");
  const [resendNrcLast6, setResendNrcLast6] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    let isMounted = true;
    let hasResolvedSession = false;
    const acceptedEvents = new Set(["PASSWORD_RECOVERY", "SIGNED_IN", "TOKEN_REFRESHED"]);

    const cleanUrl = () => {
      window.history.replaceState(null, "", "/auth/setup-password");
    };

    const applySession = (
      session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
    ) => {
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
    else if (password !== confirmPassword)
      nextErrors.confirmPassword = "Password and Confirm Password must match.";

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
      if (!session?.access_token)
        throw new Error("Unable to finalize approval. Please open the setup link again.");

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

  const handleResendSetupLink = async (event: FormEvent) => {
    event.preventDefault();
    setResendError("");
    setResendMessage("");

    const normalizedEmail = resendEmail.trim().toLowerCase();
    const normalizedNrcLast6 = sanitizeNrcLast6(resendNrcLast6);

    if (!normalizedEmail) {
      setResendError("Email ဖြည့်ပါ။");
      return;
    }

    if (!/^[0-9]{6}$/.test(normalizedNrcLast6)) {
      setResendError("NRC နောက်ဆုံးဂဏန်း ၆ လုံးကို မှန်ကန်စွာဖြည့်ပါ။");
      return;
    }

    setResendLoading(true);
    try {
      const result = await requestSchoolAdminPasswordSetupLink({
        data: {
          email: normalizedEmail,
          nrcLast6: normalizedNrcLast6,
        },
      });

      setResendMessage(result.message || "Password setup link အသစ်ကို email သို့ပို့ထားပါသည်။");
      setResendEmail(normalizedEmail);
      setResendNrcLast6("");
    } catch (err) {
      setResendError(
        err instanceof Error ? err.message : "Password setup link အသစ်မပို့နိုင်သေးပါ။",
      );
    } finally {
      setResendLoading(false);
    }
  };

  const linkUnavailable = !loadingSession && Boolean(error && !email);

  return (
    <main className="aqua-page grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <Link to="/" className="mx-auto mb-6 flex w-fit items-center justify-center gap-3">
          <Logo />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-foreground sm:text-base">
              Myanmar Education Platform
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              School Admin Access
            </span>
          </div>
        </Link>

        <div className="aqua-card space-y-5 p-6 sm:p-8">
          <div className="text-center">
            <div className="theme-icon-tile-strong mx-auto mb-4 h-14 w-14 rounded-2xl">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold glow-text">Set your password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Activate your approved School Admin account for Myanmar Education Platform.
            </p>
          </div>

          <div className="glass-panel flex items-start gap-3 rounded-2xl p-4">
            <div className="theme-icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">
                Myanmar Education Platform invitation
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                This secure setup link is for creating your School Admin password.
              </p>
            </div>
          </div>

          {loadingSession ? (
            <div className="glass-panel flex items-center justify-center gap-2 rounded-2xl p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking secure invitation link...
            </div>
          ) : linkUnavailable ? (
            <form onSubmit={handleResendSetupLink} className="space-y-4">
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>

              <div className="glass-panel space-y-4 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="theme-icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                    <MailPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      Request a new setup link
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Enter the approved application email and NRC last 6 digits.
                    </p>
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Email</span>
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(event) => setResendEmail(event.target.value)}
                    className="aqua-input w-full rounded-xl px-4 py-3 text-sm"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">NRC last 6 digits</span>
                  <input
                    value={resendNrcLast6}
                    onChange={(event) => setResendNrcLast6(sanitizeNrcLast6(event.target.value))}
                    className="aqua-input w-full rounded-xl px-4 py-3 text-sm font-mono tracking-[0.2em]"
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </label>

                {resendError && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {resendError}
                  </div>
                )}

                {resendMessage && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
                    {resendMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resendLoading}
                  className="aqua-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MailPlus className="h-4 w-4" />
                  )}
                  Send new setup link
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
                )}
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
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                className="aqua-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Set your password
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
