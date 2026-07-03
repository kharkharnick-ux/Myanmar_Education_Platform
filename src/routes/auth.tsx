import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ဝင်ရောက်ရန် — Myanmar Education ERP" },
      {
        name: "description",
        content:
          "Myanmar Education ERP သို့ ဝင်ရောက်ရန် အကောင့်ဖြင့် Sign in ပြုလုပ်ပါ။",
      },
      { property: "og:title", content: "ဝင်ရောက်ရန် — Myanmar Education ERP" },
      {
        property: "og:description",
        content: "ကျောင်းများ၊ ဆရာများနှင့် ကျောင်းသားများအတွက် ဝင်ရောက်မှုစာမျက်နှာ။",
      },
    ],
  }),
  component: AuthRouteComponent,
});

function AuthRouteComponent() {
  const location = useLocation();

  if (location.pathname !== "/auth") {
    return <Outlet />;
  }

  return <AuthPage />;
}

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme, mounted } = useTheme();

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("password_created") === "1") {
    setSuccessMessage("Password သတ်မှတ်ပြီးပါပြီ။ ယခု သင့် email နှင့် password ဖြင့် login ဝင်နိုင်ပါသည်။");
    window.history.replaceState(null, "", "/auth");
  }
}, []);

async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  setError(null);
  setSuccessMessage(null);

  if (!email.trim() || !password) {
    setError("ကျေးဇူးပြု၍ Email နှင့် Password ထည့်ပါ။");
    return;
  }

  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const { data: profile } = data.user
      ? await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", data.user.id)
          .maybeSingle()
      : { data: null };

    if (profile?.role === "school_admin") {
      navigate({
        to: "/school-admin",
      });
      return;
    }

    navigate({
      to: profile?.role === "super_admin" ? "/super-admin" : "/school-admin",
    });

  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "ဝင်ရောက်မှု မအောင်မြင်ပါ။"
    );
  } finally {
    setLoading(false);
  }
  // ... (auth.tsx content remains identical)
}

  return (
    <main className="aqua-page w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground sm:text-base">
                မြန်မာပညာရေးစီမံခန့်ခွဲမှုစနစ်
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                Myanmar Education ERP
              </span>
            </div>
          </Link>
          <Link
            to="/"
            className="rounded-xl glass-panel px-4 py-2 text-sm font-medium text-foreground/80 transition hover:text-foreground"
          >
            ← မူလစာမျက်နှာ
          </Link>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-5">
          {/* Right side on mobile order — visual */}
          <section className="order-1 lg:order-2 lg:col-span-3">
            <div className="flex flex-col items-center text-center">
              <img
                src="/images/school-hero.png"
                alt="Myanmar Education ERP school illustration"
                className="float w-full max-w-xl object-contain drop-shadow-[0_20px_50px_oklch(0.55_0.2_245/0.25)] dark:hidden"
              />
              <img
                src="/images/school-hero-dark.png"
                alt="Myanmar Education ERP school illustration"
                className="float w-full max-w-xl object-contain drop-shadow-[0_20px_50px_oklch(0.55_0.2_245/0.25)] hidden dark:block"
              />
              <h2 className="mt-8 text-2xl font-bold leading-snug text-foreground sm:text-3xl glow-text">
                အနာဂတ်တက်လမ်း သူပေးစွမ်း
                <br />
                ကျောင်းသားပညာရေး ထွန်းလင်းစေ
              </h2>
              <p className="mt-4 max-w-lg text-sm text-muted-foreground sm:text-base">
                Myanmar Education ERP သည် ကျောင်းများ၊ ဆရာများနှင့် ကျောင်းသားများအတွက်
                ခေတ်မီ ဒစ်ဂျစ်တယ် ပညာရေးစီမံခန့်ခွဲမှုစနစ် တစ်ခုဖြစ်ပါသည်။
              </p>
            </div>
          </section>

          {/* Login form */}
          <section className="order-2 lg:order-1 lg:col-span-2">
            <div className="aqua-card p-6 sm:p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  ဝင်ရောက်ရန်
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  သင့်အကောင့်ဖြင့် ဆက်လက်အသုံးပြုပါ။
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground/90">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="aqua-input w-full rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-transparent focus:glow-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground/90">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="aqua-input w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-muted-foreground focus:border-transparent focus:glow-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent/40 hover:text-foreground"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                        {showPassword ? (
                          <>
                            <path d="M3 3l18 18" />
                            <path d="M10.6 6.2A10 10 0 0 1 22 12a10 10 0 0 1-3.1 4.3M6.5 6.5A10 10 0 0 0 2 12a10 10 0 0 0 13.5 5.5" />
                          </>
                        ) : (
                          <>
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
                    {successMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="aqua-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                      ခေတ္တစောင့်ပါ…
                    </>
                  ) : (
                    "ဝင်ရောက်ရန်"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                အကောင့်မရှိသေးပါက ကျောင်းအုပ်ချုပ်သူထံ ဆက်သွယ်ပါ။
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
