import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, LogIn, Megaphone, Moon, Phone, School, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Logo } from "./Logo";

const NAV = [
  { label: "မူလစာမျက်နှာ", href: "/", Icon: Home },
  { label: "ကျောင်းများ", href: "/schools", Icon: School },
  { label: "ကြေညာချက်များ", href: "/announcements", Icon: Megaphone },
  { label: "ဆက်သွယ်ရန်", href: "/contact", Icon: Phone },
];

export function SiteHeader() {
  const { theme, mounted, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-6">
      <div className="mx-auto max-w-[1560px]">
        <div className="landing-nav-bar flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="landing-brand-title max-w-[13rem] truncate text-sm font-bold sm:max-w-none sm:text-base">
                မြန်မာပညာရေးစီမံခန့်ခွဲမှုစနစ်
              </span>
              <span className="landing-brand-subtitle text-[10px] uppercase tracking-wider sm:text-xs">
                Myanmar Education ERP
              </span>
            </div>
          </Link>

          <nav className="hidden items-center justify-center gap-1 rounded-2xl border border-border bg-secondary/35 px-2 py-1.5 backdrop-blur-2xl lg:flex">
            {NAV.map(({ Icon, ...item }) => (
              <Link
                key={item.href}
                to={item.href}
                activeProps={{ className: "landing-nav-item-active" }}
                className="landing-nav-item"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="landing-nav-control glass-panel grid h-10 w-10 place-items-center rounded-xl transition hover:glow-ring"
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
            </button>
            <Link
              to="/auth"
              className="aqua-button hidden items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:brightness-110 sm:inline-flex"
            >
              <LogIn className="h-4 w-4" />
              ဝင်ရောက်ရန်
            </Link>
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setOpen((value) => !value)}
              className="landing-nav-control grid h-10 w-10 place-items-center rounded-xl glass-panel lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="aqua-dropdown mt-2 flex flex-col gap-1 rounded-3xl p-3 lg:hidden">
            {NAV.map(({ Icon, ...item }) => (
              <Link
                key={item.href}
                to={item.href}
                activeProps={{ className: "landing-nav-item-active" }}
                className="landing-nav-item justify-start"
                onClick={() => setOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              to="/auth"
              className="aqua-button mt-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-center text-sm font-bold sm:hidden"
            >
              <LogIn className="h-4 w-4" />
              ဝင်ရောက်ရန်
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
