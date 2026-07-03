import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title = "ဒေတာမရှိသေးပါ",
  description = "Database တွင် မှတ်တမ်းများ ထည့်သွင်းပြီးပါက ဤနေရာတွင် ပြသပါမည်။",
  action,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="aqua-panel flex flex-col items-center justify-center gap-4 p-10 text-center sm:p-16">
      <div className="theme-icon-tile gloss-highlight relative h-20 w-20 rounded-2xl">
        <Icon className="h-9 w-9" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="aqua-section-title text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
