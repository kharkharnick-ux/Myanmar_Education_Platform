import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";
import { SiteFooter } from "@/components/site/Footer";
import { Announcements } from "@/components/site/Announcements";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "ကြေညာချက်များ — Myanmar Education ERP" },
      {
        name: "description",
        content: "နောက်ဆုံးရရှိသော သတင်းနှင့် ကြေညာချက်များကို ဤနေရာတွင် ဖတ်ရှုနိုင်ပါသည်။",
      },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  return (
    <div className="aqua-page">
      <SiteHeader />
      <main className="py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <div className="gloss-highlight mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary glow-ring">
              <Megaphone className="h-8 w-8" />
            </div>
            <h1 className="aqua-section-title mb-4 text-4xl">ကြေညာချက်များ</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">နောက်ဆုံးရရှိသော သတင်းအချက်အလက်များကို တစ်နေရာတည်းတွင် ကြည့်ရှုနိုင်ပါသည်။</p>
          </div>
          <Announcements />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
