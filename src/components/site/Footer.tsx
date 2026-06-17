import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 max-w-7xl px-4 pb-10 sm:px-6">
      <div className="glass grid gap-10 p-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-base font-semibold text-foreground">Myanmar Education ERP</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            ကျောင်းများ၊ ဆရာများနှင့် ကျောင်းသားများအတွက် ဒစ်ဂျစ်တယ်ပညာရေး စီမံခန့်ခွဲမှု ပလက်ဖောင်း။
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">လင့်ခ်များ</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/" className="hover:text-foreground">မူလစာမျက်နှာ</a></li>
            <li><a href="/schools" className="hover:text-foreground">ကျောင်းများ</a></li>
            <li><a href="/announcements" className="hover:text-foreground">ကြေညာချက်များ</a></li>
            <li><a href="/contact" className="hover:text-foreground">ဆက်သွယ်ရန်</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">ဆက်သွယ်ရန်</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✉️ support@myanmar-edu.example</li>
            <li>📞 +95 9 000 000 000</li>
            <li>📍 Yangon, Myanmar</li>
          </ul>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Myanmar Education ERP. All rights reserved.
      </p>
    </footer>
  );
}
