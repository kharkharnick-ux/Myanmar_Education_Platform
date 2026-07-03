import { cn } from "@/lib/utils";

export function PillTabs({
  tabs, value, onChange,
}: { tabs: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="aqua-panel mb-4 inline-flex max-w-full overflow-x-auto p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all",
            value === t.value
              ? "theme-active-surface"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/35",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
