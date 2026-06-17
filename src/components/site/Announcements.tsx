import { useEffect, useState } from "react";
import { fetchAnnouncements, type Announcement } from "@/lib/site-data";

export function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements()
      .then(setItems)
      .catch((e) => setError(e?.message ?? "Error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          နောက်ဆုံးကြေညာချက်များ
        </h2>
        <a href="/announcements" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
          အားလုံးကြည့်ရန် →
        </a>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)}
        {!loading && error && (
          <div className="col-span-full glass p-8 text-center text-sm text-destructive">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="col-span-full glass p-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full glass-panel">📣</div>
            <p className="text-base font-semibold text-foreground">ကြေညာချက်များ မရှိသေးပါ</p>
            <p className="mt-1 text-sm text-muted-foreground">အသစ်ထွက်ပါက ဤနေရာတွင် ဖော်ပြပါမည်။</p>
          </div>
        )}
        {!loading && !error && items.map((a) => (
          <article key={a.id} className="glass overflow-hidden transition hover:shadow-[var(--shadow-glow)]">
            <div
              className="h-40 w-full"
              style={{
                background: a.thumbnailUrl
                  ? `center/cover url(${a.thumbnailUrl})`
                  : "linear-gradient(135deg, oklch(0.82 0.24 220 / 0.5), oklch(0.72 0.22 240 / 0.4))",
              }}
            />
            <div className="space-y-2 p-5">
              <p className="text-xs text-muted-foreground">{a.publishedAt}</p>
              <h3 className="line-clamp-2 text-base font-semibold text-foreground">{a.title}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">{a.summary}</p>
              <a
                href={`/announcements/${a.id}`}
                className="mt-2 inline-flex rounded-lg glass-panel px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/40"
              >
                အသေးစိတ်ကြည့်ရန်
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="glass overflow-hidden">
      <div className="h-40 animate-pulse bg-accent/40" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 animate-pulse rounded bg-accent/50" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-accent/60" />
        <div className="h-3 w-full animate-pulse rounded bg-accent/40" />
      </div>
    </div>
  );
}
