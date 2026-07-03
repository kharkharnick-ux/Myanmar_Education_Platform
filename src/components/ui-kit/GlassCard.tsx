import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function GlassCard({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  const keepsOverflowHidden = typeof className === "string" && className.includes("overflow-hidden");

  return (
    <div
      className={cn("aqua-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:aqua-glow", className)}
      style={{
        overflow: keepsOverflowHidden ? style?.overflow : style?.overflow || "visible",
        ...style,
      }}
      {...props}
    />
  );
}
