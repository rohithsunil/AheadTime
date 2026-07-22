import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { getTimeUntilMidnight } from "@/lib/streakUtils";
import { cn } from "@/lib/utils";

// Countdown timer showing time left until local midnight — when the
// next streak day can be claimed. Ticks every second.
export default function StreakCountdown({ streak }) {
  const [time, setTime] = useState(() => getTimeUntilMidnight());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-2xl px-3.5 py-2.5",
      streak > 0 ? "glass-frost" : "bg-foreground/5"
    )}>
      <Clock className="w-4 h-4 text-[#FF8C42] dark:text-orange-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Next streak in</p>
        <p className="text-foreground text-sm font-semibold tabular-nums leading-tight">
          {pad(time.hours)}h {pad(time.minutes)}m {pad(time.seconds)}s
        </p>
      </div>
    </div>
  );
}