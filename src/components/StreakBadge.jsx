import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// Compact streak badge for the home header
export default function StreakBadge({ streak, onClick }) {
  if (!streak || streak < 1) return null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-frost active:scale-95 transition-transform select-none",
      )}
    >
      <Flame className={cn("w-4 h-4", streak >= 7 ? "text-orange-500" : "text-amber-500")} fill={streak >= 7 ? "currentColor" : "none"} />
      <span className="text-foreground text-sm font-semibold tabular-nums">{streak}</span>
      <span className="text-muted-foreground text-xs">day{streak > 1 ? "s" : ""}</span>
    </button>
  );
}