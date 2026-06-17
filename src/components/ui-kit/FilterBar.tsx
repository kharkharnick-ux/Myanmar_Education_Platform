import { Search, Filter } from "lucide-react";
import type { ReactNode } from "react";

export function FilterBar({ children, searchPlaceholder = "ရှာဖွေရန်..." }: { children?: ReactNode; searchPlaceholder?: string }) {
  return (
    <div className="glass mb-4 p-3 flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full glass-panel rounded-xl bg-transparent pl-10 pr-3 py-2 text-sm outline-none focus:glow-ring transition-all"
          placeholder={searchPlaceholder}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        <button className="glass-panel inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:glow-ring transition-all">
          <Filter className="h-4 w-4" /> Filter
        </button>
      </div>
    </div>
  );
}

export function FilterSelect({ label, options }: { label: string; options?: string[] }) {
  return (
    <select className="glass-panel rounded-xl bg-transparent px-3 py-2 text-sm outline-none focus:glow-ring transition-all">
      <option value="">{label}</option>
      {options?.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
