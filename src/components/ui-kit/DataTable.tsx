import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { type LucideIcon } from "lucide-react";

export function DataTable({
  columns, rows, emptyIcon, emptyTitle, emptyDescription,
}: {
  columns: string[];
  rows: ReactNode[][];
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="glass overflow-hidden">
        <div className="hidden md:grid border-b border-white/10 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
             style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((c) => <div key={c} className="truncate">{c}</div>)}
        </div>
        <div className="p-2">
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        </div>
      </div>
    );
  }
  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((c) => (
                <th key={c} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                {r.map((cell, j) => <td key={j} className="px-5 py-3">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
