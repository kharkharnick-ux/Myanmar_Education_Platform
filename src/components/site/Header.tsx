import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

const NAV = [
  { label: "မူလစာမျက်နှာ", href: "/" },
  { label: "ကျောင်းများ", href: "/schools" },
  { label: "ကြေညာချက်များ", href: "/announcements" },
  { label: "ဆက်သွယ်ရန်", href: "/contact" },
];

export function SiteHeader() {
  const { theme, mounted, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto mt-3 max-w-7xl px-3 sm:px-6">
        <div className="glass flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
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

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-accent/40 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="glass-panel rounded-xl p-2"
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
              className="hidden rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90 sm:inline-flex"
            >
              ဝင်ရောက်ရန်
            </Link>
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl glass-panel lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="glass mt-2 flex flex-col gap-1 p-3 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-accent/40"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/auth"
              className="mt-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground sm:hidden"
            >
              ဝင်ရောက်ရန်
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
