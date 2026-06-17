import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";
import { SiteFooter } from "@/components/site/Footer";
import { SchoolDiscovery } from "@/components/site/SchoolDiscovery";

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: [
      { title: "ကျောင်းများ ရှာဖွေရန် — Myanmar Education ERP" },
      {
        name: "description",
        content: "မြန်မာနိုင်ငံတစ်ဝှမ်းရှိ ကျောင်းများအားလုံးကို တစ်နေရာတည်းတွင် ရှာဖွေကြည့်ရှုနိုင်ပါသည်။",
      },
    ],
  }),
  component: SchoolsPage,
});

function SchoolsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="py-20">
        <div className="container">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold glow-text mb-4">ကျောင်းများ</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              သင့်ကလေးအတွက် အသင့်တော်ဆုံး ပညာရေးဝန်ဆောင်မှုများ ပေးအပ်နေသည့် 
              ကျောင်းများကို အောက်ပါစာရင်းတွင် စစ်ထုတ်ရှာဖွေနိုင်ပါသည်။
            </p>
          </div>
          <SchoolDiscovery />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
