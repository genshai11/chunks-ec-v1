import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";

interface LearnerLayoutProps {
  children: ReactNode;
  contentClassName?: string;
}

export const LearnerLayout = ({ children, contentClassName }: LearnerLayoutProps) => (
  <div className="min-h-screen bg-background">
    <Sidebar />
    <main className="lg:ml-[var(--learner-sidebar-width,16rem)] p-4 lg:p-8 pt-20 lg:pt-10 transition-all duration-200">
      <div className={cn("w-full mx-auto space-y-6 max-w-6xl", contentClassName)}>{children}</div>
    </main>
  </div>
);

