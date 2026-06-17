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
    <div className="glass flex flex-col items-center justify-center gap-4 p-10 sm:p-16 text-center">
      <div className="relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.75_0.22_225/0.30)] to-[oklch(0.55_0.25_260/0.20)] glow-ring float">
        <Icon className="h-9 w-9 text-[var(--neon)]" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-lg font-semibold glow-text">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
