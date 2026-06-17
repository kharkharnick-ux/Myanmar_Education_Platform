import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { SchoolDiscovery } from "@/components/site/SchoolDiscovery";
import { Features } from "@/components/site/Features";
import { Announcements } from "@/components/site/Announcements";
import { SiteFooter } from "@/components/site/Footer";


export const Route = createFileRoute("/homepage")({
  head: () => ({
    meta: [
      { title: "Myanmar Education ERP — ဒစ်ဂျစ်တယ်ပညာရေး စီမံခန့်ခွဲမှုစနစ်" },
      {
        name: "description",
        content:
          "ကျောင်းများ၊ ဆရာများနှင့် ကျောင်းသားများအတွက် လုံခြုံပြီး ထိရောက်သော ပညာရေးစီမံခန့်ခွဲမှု ပလက်ဖောင်း။",
      },
      { property: "og:title", content: "Myanmar Education ERP" },
      {
        property: "og:description",
        content: "မြန်မာနိုင်ငံ၏ ပညာရေးအတွက် ဒစ်ဂျစ်တယ်စီမံခန့်ခွဲမှု ဝန်ဆောင်မှု။",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <SchoolDiscovery />
        <Features />
        <Announcements />
      </main>
      <SiteFooter />
    </div>
  );
}
