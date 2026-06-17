import { useEffect, useState } from "react";
import { REGIONS, fetchSchools, type School } from "@/lib/site-data";

export function SchoolDiscovery() {
  const [active, setActive] = useState<string>(REGIONS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSchools(active)
      .then((rows) => {
        if (!cancelled) setSchools(rows.slice(0, 4));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  return (
    <section id="schools" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          ကျောင်းများကို ရှာဖွေပါ
        </h2>
      </div>

      <div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
        {REGIONS.map((r) => {
          const isActive = active === r;
          return (
            <button
              key={r}
              onClick={() => setActive(r)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "glass-panel text-foreground/80 hover:bg-accent/40"
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && error && (
          <div className="col-span-full glass p-8 text-center text-sm text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && schools.length === 0 && (
          <div className="col-span-full glass p-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full glass-panel">
              🏫
            </div>
            <p className="text-base font-semibold text-foreground">ကျောင်းများ မရှိသေးပါ</p>
            <p className="mt-1 text-sm text-muted-foreground">
              အသစ်ထည့်ပြီးပါက ဤနေရာတွင် ဖော်ပြပါမည်။
            </p>
          </div>
        )}
        {!loading && !error && schools.map((s) => <SchoolCard key={s.id} school={s} />)}
      </div>

      <div className="mt-10 flex justify-center">
        <a
          href="/schools"
          className="rounded-xl glass-strong px-6 py-3 text-sm font-semibold text-foreground transition hover:opacity-90"
        >
          ကျောင်းများအားလုံးကြည့်ရန်
        </a>
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="glass overflow-hidden">
      <div className="h-32 animate-pulse bg-accent/40" />
      <div className="space-y-3 p-4">
        <div className="h-10 w-10 -mt-9 rounded-xl bg-muted/70" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-accent/60" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-accent/40" />
        <div className="h-8 w-full animate-pulse rounded bg-accent/40" />
      </div>
    </div>
  );
}

function SchoolCard({ school }: { school: School }) {
  return (
    <article className="glass group overflow-hidden transition hover:shadow-[var(--shadow-glow)]">
      <div
        className="h-32 w-full"
        style={{
          background: school.coverUrl
            ? `center/cover url(${school.coverUrl})`
            : "linear-gradient(135deg, oklch(0.72 0.22 240 / 0.6), oklch(0.82 0.24 220 / 0.5))",
        }}
      />
      <div className="p-4">
        <div className="-mt-10 mb-3 grid h-12 w-12 place-items-center rounded-xl glass-strong text-base">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            "🏫"
          )}
        </div>
        <h3 className="line-clamp-1 text-base font-semibold text-foreground">{school.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">📍 {school.region}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-foreground/80">
          <span className="inline-flex items-center gap-1">⭐ {school.rating.toFixed(1)}</span>
          <span className="inline-flex items-center gap-1">📊 {school.passRate}%</span>
        </div>
        <a
          href={`/schools/${school.id}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg glass-panel px-3 py-2 text-xs font-semibold text-foreground transition group-hover:bg-primary group-hover:text-primary-foreground"
        >
          အသေးစိတ်ကြည့်ရန်
        </a>
      </div>
    </article>
  );
}
