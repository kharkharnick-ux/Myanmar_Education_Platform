import { useEffect, useState } from "react";
import { School as SchoolIcon } from "lucide-react";
import { REGIONS, fetchSchools, hasFreshApprovedSchoolsCache, type School } from "@/lib/site-data";

export function SchoolDiscovery({ limit }: { limit?: number }) {
  const [active, setActive] = useState<string>(REGIONS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    let cancelled = false;
    const showSkeleton = !hasFreshApprovedSchoolsCache();
    if (showSkeleton) setLoading(true);
    setError(null);

    fetchSchools(active)
      .then((rows) => {
        if (!cancelled) setSchools(typeof limit === "number" ? rows.slice(0, limit) : rows);
      })
      .catch((error) => {
        if (!cancelled) setError(error?.message ?? "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, limit]);

  return (
    <section id="schools" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          ကျောင်းများကို ရှာဖွေပါ
        </h2>
      </div>

      <div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
        {REGIONS.map((region) => {
          const isActive = active === region;
          return (
            <button
              key={region}
              type="button"
              onClick={() => setActive(region)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "glass-panel text-foreground/80 hover:bg-accent/40"
              }`}
            >
              {region}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {loading && Array.from({ length: limit || 4 }).map((_, index) => <SkeletonCard key={index} />)}

        {!loading && error && (
          <div className="col-span-full aqua-card p-8 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && schools.length === 0 && (
          <div className="col-span-full aqua-card p-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full glass-panel">
              <SchoolIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground">ကျောင်းများ မရှိသေးပါ</p>
            <p className="mt-1 text-sm text-muted-foreground">
              အတည်ပြုပြီးသော ကျောင်းများ ရှိလာပါက ဤနေရာတွင် ပြသပါမည်။
            </p>
          </div>
        )}

        {!loading && !error && schools.map((school) => <SchoolCard key={school.id} school={school} />)}
      </div>

      <div className="mt-10 flex justify-center">
        <a href="/schools" className="aqua-button rounded-xl px-6 py-3 text-sm font-semibold transition hover:brightness-105">
          ကျောင်းများအားလုံးကြည့်ရန်
        </a>
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="aqua-card overflow-hidden">
      <div className="h-32 animate-pulse bg-accent/40" />
      <div className="space-y-3 p-4">
        <div className="-mt-9 h-10 w-10 rounded-xl bg-primary/15 shadow-[var(--shadow-glow)]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-accent/60" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-accent/40" />
        <div className="h-8 w-full animate-pulse rounded bg-accent/40" />
      </div>
    </div>
  );
}

function SchoolCard({ school }: { school: School }) {
  return (
    <article className="aqua-card group overflow-hidden transition hover:shadow-[var(--shadow-glow)]">
      <div
        className="h-32 w-full"
        style={{
          background: school.coverUrl
            ? `center/cover url(${school.coverUrl})`
            : "linear-gradient(135deg, oklch(0.72 0.22 240 / 0.6), oklch(0.82 0.24 220 / 0.5))",
        }}
      />
      <div className="p-4">
        <div className="-mt-10 mb-3 grid h-12 w-12 place-items-center rounded-xl glass-strong gloss-highlight text-base">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <SchoolIcon className="h-6 w-6 text-primary" />
          )}
        </div>

        <h3 className="line-clamp-1 text-base font-semibold text-foreground">{school.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {school.schoolType} • {school.gradeFrom} to {school.gradeTo}
        </p>
        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
          {school.region || "-"} {school.township ? ` / ${school.township}` : ""}
        </p>
        {school.address && <p className="mt-2 line-clamp-2 text-xs text-foreground/75">{school.address}</p>}

        <div className="mt-3 space-y-1 text-xs text-foreground/80">
          {school.phone && <p>{school.phone}</p>}
          {school.email && <p className="truncate">{school.email}</p>}
          {school.website && <p className="truncate">{school.website}</p>}
        </div>

        <div className="hidden">
          အသေးစိတ်ကြည့်ရန်
        </div>
      </div>
    </article>
  );
}
