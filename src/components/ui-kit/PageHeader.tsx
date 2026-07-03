import type { ReactNode } from "react";

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="aqua-panel gloss-highlight mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
      <div className="min-w-0">
        <h1 className="aqua-section-title truncate text-2xl sm:text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
