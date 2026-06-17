const FEATURES = [
  { icon: "🏫", title: "ကျောင်းစီမံခန့်ခွဲမှု", desc: "ကျောင်းဆိုင်ရာအချက်အလက်များကို စနစ်တကျ စီမံနိုင်ပါသည်။" },
  { icon: "👨‍🏫", title: "ဆရာစီမံခန့်ခွဲမှု", desc: "ဆရာများ၏ အချက်အလက်များကို လွယ်ကူစွာ စီမံနိုင်ပါသည်။" },
  { icon: "👨‍🎓", title: "ကျောင်းသားစီမံခန့်ခွဲမှု", desc: "ကျောင်းသားများ၏ မှတ်တမ်းများကို စနစ်တကျ စီမံနိုင်ပါသည်။" },
  { icon: "🔒", title: "လုံခြုံသောအချက်အလက်စနစ်", desc: "အချက်အလက်များကို လုံခြုံစွာ သိမ်းဆည်းထားပါသည်။" },
];

export function Features() {
  return (
    <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
      <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများ
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="glass group p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl glass-strong text-2xl">
              {f.icon}
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
