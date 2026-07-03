import { Search, Filter } from "lucide-react";
import type { ReactNode } from "react";

export function FilterBar({
  children,
  searchPlaceholder = "ရှာဖွေရန်...",
  searchValue,
  onSearchChange,
}: {
  children?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  return (
    <div className="aqua-panel gloss-highlight mb-4 flex flex-col gap-2 p-3 sm:flex-row">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="aqua-input w-full rounded-xl pl-10 pr-3 py-2 text-sm outline-none transition-all focus:glow-ring"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        <button className="glass-panel inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all hover:glow-ring">
          <Filter className="h-4 w-4" /> Filter
        </button>
      </div>
    </div>
  );
}

export function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options?: string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      className="aqua-input rounded-xl px-3 py-2 text-sm outline-none transition-all focus:glow-ring"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="">{label}</option>
      {options?.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
