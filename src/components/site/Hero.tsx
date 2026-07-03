import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  School,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const FLOATING_ICONS = [
  { Icon: BookOpen, className: "left-[7%] top-[18%] hidden lg:grid" },
  { Icon: School, className: "right-[8%] top-[20%] hidden lg:grid" },
  { Icon: Users, className: "left-[13%] bottom-[24%] hidden md:grid" },
  { Icon: ShieldCheck, className: "right-[13%] bottom-[24%] hidden md:grid" },
  { Icon: BarChart3, className: "left-[28%] top-[10%] hidden xl:grid" },
  { Icon: UserRound, className: "right-[28%] top-[10%] hidden xl:grid" },
];

export function Hero() {
  return (
    <section className="mx-auto mt-8 max-w-[1560px] px-3 sm:mt-10 sm:px-6 lg:px-8">
      <div className="landing-hero-shell min-h-[calc(100vh-7.5rem)] overflow-hidden rounded-[32px] px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div
          aria-hidden
          className="landing-hero-photo bg-[url('/images/school-hero.png')] dark:hidden"
        />
        <div
          aria-hidden
          className="landing-hero-photo hidden bg-[url('/images/school-hero-dark.png')] dark:block"
        />
        <div aria-hidden className="landing-hero-overlay-primary" />
        <div aria-hidden className="landing-hero-overlay-secondary" />

        {FLOATING_ICONS.map(({ Icon, className }, index) => (
          <div
            key={index}
            aria-hidden
            className={`landing-float-icon float absolute ${className}`}
            style={{ animationDelay: `${index * 0.7}s` }}
          >
            <Icon className="h-6 w-6" />
          </div>
        ))}

        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-6xl flex-col items-center justify-center text-center">
          <span className="landing-hero-badge gloss-highlight inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[var(--shadow-glow)]" />
            အရည်အသွေးမြင့် ပညာရေးအတွက်
          </span>

          <h1 className="mt-8 max-w-6xl text-[clamp(2.45rem,7vw,6.5rem)] font-black leading-[1.08] tracking-normal">
            <span className="landing-hero-title block">
              ယုံကြည်စိတ်ချရသော
            </span>
            <span className="landing-cyan-text block">
              ဒစ်ဂျစ်တယ်စနစ်
            </span>
          </h1>

          <p className="landing-hero-copy mt-7 max-w-4xl text-balance text-base leading-8 sm:text-lg lg:text-xl">
            ကျောင်းများ၊ ဆရာများနှင့် ကျောင်းသားများအတွက် လုံခြုံပြီး ထိရောက်သော ပညာရေးစီမံခန့်ခွဲမှု ဝန်ဆောင်မှုများကို ပေးအပ်လျက်ရှိပါသည်။
          </p>

          <div className="mt-9 flex w-full max-w-3xl flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#schools"
              className="aqua-button inline-flex items-center justify-center rounded-2xl px-7 py-4 text-sm font-bold transition hover:brightness-110"
            >
              ကျောင်းများရှာဖွေရန်
            </a>
            <Link
              to="/register/school-admin"
              className="landing-secondary-action glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold transition hover:bg-accent/35 hover:glow-ring"
            >
              <span>ကျောင်းလျှောက်ထားရန်</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register/school-admin/status"
              className="landing-secondary-action glass-panel inline-flex items-center justify-center rounded-2xl px-7 py-4 text-sm font-bold transition hover:bg-accent/35 hover:glow-ring"
            >
              ကျောင်းလျှောက်ထားချက်များ
            </Link>
          </div>
        </div>

        <div aria-hidden className="landing-hero-wave" />
      </div>
    </section>
  );
}
