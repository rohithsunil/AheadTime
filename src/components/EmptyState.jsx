import React from "react";
import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title, subtitle, action, actionLabel, className }) {
  return (
    <div className={cn("glass-frost rounded-2xl p-8 flex flex-col items-center text-center", className)}>
      <div className="relative w-20 h-20 flex items-center justify-center mb-4">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-950/30 dark:to-pink-950/30" />
        <div className="absolute inset-2 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur-sm" />
        <Icon className="relative w-8 h-8 text-[#FF8C42] dark:text-orange-400" strokeWidth={1.5} />
      </div>
      <p className="text-foreground font-medium text-sm">{title}</p>
      {subtitle && <p className="text-muted-foreground text-xs mt-1 max-w-[200px]">{subtitle}</p>}
      {action && (
        <button
          onClick={action}
          className="mt-4 px-4 py-2 rounded-full accent-gradient text-white text-xs font-semibold active:scale-95 transition-transform shadow-md shadow-orange-500/20"
        >
          {actionLabel || "Add"}
        </button>
      )}
    </div>
  );
}