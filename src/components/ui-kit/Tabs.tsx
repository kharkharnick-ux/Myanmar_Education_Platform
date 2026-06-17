import { cn } from "@/lib/utils";

export function PillTabs({
  tabs, value, onChange,
}: { tabs: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="glass inline-flex p-1 mb-4 overflow-x-auto max-w-full">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-all",
            value === t.value
              ? "bg-gradient-to-r from-[oklch(0.70_0.20_225/0.35)] to-[oklch(0.55_0.25_260/0.25)] glow-ring text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
