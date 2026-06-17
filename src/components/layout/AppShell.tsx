import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-[oklch(0.65_0.25_240/0.20)] blur-[120px] float" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-[oklch(0.70_0.22_200/0.18)] blur-[140px] float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[40%] right-[20%] h-[300px] w-[300px] rounded-full bg-[oklch(0.60_0.25_260/0.15)] blur-[100px] float" style={{ animationDelay: "4s" }} />
      </div>

      <MobileNav />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
