import { FileText, CalendarClock, CalendarDays, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// The 4-stat tappable card from the reference design.
// Each stat navigates to a filtered document view.
export default function StatCard({ stats, onNavigate }) {
  const items = [
    { key: "total", label: "Total", value: stats.total, icon: FileText, color: "text-[#2D7AF1] dark:text-blue-400", onClick: () => onNavigate("all") },
    { key: "week", label: "This Week", value: stats.week, icon: CalendarClock, color: "text-[#FF8C42] dark:text-orange-400", onClick: () => onNavigate("week") },
    { key: "month", label: "This Month", value: stats.month, icon: CalendarDays, color: "text-amber-600 dark:text-amber-400", onClick: () => onNavigate("month") },
    { key: "overdue", label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-rose-600 dark:text-rose-400", onClick: () => onNavigate("overdue") },
  ];

  return (
    <div className="glass-frost rounded-3xl p-2">
      <div className="grid grid-cols-4">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className={cn(
                "flex flex-col items-center gap-1.5 py-4 px-2 active:scale-95 transition-transform select-none",
                idx < items.length - 1 && "border-r border-border/50"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-0.5", item.color)} strokeWidth={2} />
              <span className={cn("text-2xl font-display font-bold tabular-nums", item.color)}>{item.value}</span>
              <span className="text-muted-foreground text-[10px] font-medium text-center leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}