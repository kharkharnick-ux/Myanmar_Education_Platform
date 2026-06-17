import { useTheme } from "@/lib/theme";

function HeroIllustration() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <img
        src="/images/school-hero.png"
        alt="Myanmar School"
        className="w-full h-auto object-contain dark:hidden"
      />
      <img
        src="/images/school-hero-dark.png"
        alt="Myanmar School"
        className="w-full h-auto object-contain hidden dark:block"
      />
    </div>
  );
}
export function Hero() {
  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:mt-16 sm:px-6">
      <div className="grid items-center gap-10 lg:grid-cols-[40%_60%] lg:gap-16">
        <div className="space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs font-medium text-foreground/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon)] shadow-[0_0_10px_var(--neon)]" />
            အရည်အသွေးမြင့် ပညာရေးအတွက်
          </span>
          <h1 className="text-4xl font-bold leading-[1.2] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            ယုံကြည်စိတ်ချရသော
            <br />
            <span className="bg-gradient-to-r from-[var(--electric)] via-[var(--primary)] to-[var(--neon)] bg-clip-text text-transparent glow-text">
              ဒစ်ဂျစ်တယ်စနစ်
            </span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            ကျောင်းများ၊ ဆရာများနှင့် ကျောင်းသားများအတွက် လုံခြုံပြီး ထိရောက်သော
            ပညာရေးစီမံခန့်ခွဲမှု ဝန်ဆောင်မှုများကို ပေးအပ်လျက်ရှိပါသည်။
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#schools"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90"
            >
              ကျောင်းများရှာဖွေရန်
            </a>
            <a
              href="/apply"
              className="rounded-xl glass-panel px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-accent/40"
            >
              ကျောင်းလျှောက်ထားရန်
            </a>
          </div>
        </div>

        <div className="relative">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}