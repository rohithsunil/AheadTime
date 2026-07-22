import React from "react";
import { Flame, Trophy, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { STREAK_LEVELS, getStreakLevel } from "@/components/StreakRanks";
import StreakCountdown from "@/components/StreakCountdown";

// Prominent streak display — Duolingo-style levels + weekly progress.
// Shows a "Claim" button when the user hasn't claimed today's streak yet.
export default function StreakSection({ streak, best, canClaim, onClaim }) {
  const [claimed, setClaimed] = React.useState(false);
  const [burst, setBurst] = React.useState(false);

  if (!streak || streak < 1) return null;

  const currentLevel = getStreakLevel(streak);
  const nextLevel = STREAK_LEVELS.find((l) => l.level === currentLevel.level + 1);
  const progressInLevel = streak - currentLevel.min;
  const levelSpan = currentLevel.max - currentLevel.min + 1;
  const levelProgress = nextLevel ? Math.min((progressInLevel / levelSpan) * 100, 100) : 100;

  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    return d;
  });

  const isDayCompleted = (dayDate) => {
    const cmp = new Date(dayDate);
    cmp.setHours(0, 0, 0, 0);
    const t = new Date(today);
    t.setHours(0, 0, 0, 0);
    if (cmp > t) return false;
    const diffDays = Math.round((t - cmp) / 86400000);
    return diffDays < streak;
  };

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const handleClaim = (e) => {
    e.stopPropagation();
    setBurst(true);
    setTimeout(() => setBurst(false), 600);
    setClaimed(true);
    if (onClaim) onClaim();
  };

  const showClaimButton = canClaim && !claimed;

  return (
    <div className="glass-frost rounded-3xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl accent-gradient flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-white" fill={streak >= 7 ? "white" : "none"} />
          </div>
          <div className="min-w-0">
            <p className="text-foreground text-sm font-semibold truncate">
              Level {currentLevel.level} · {currentLevel.name} {currentLevel.emoji}
            </p>
            {nextLevel && (
              <p className="text-muted-foreground text-[11px] mt-0.5">
                {nextLevel.min - streak} day{nextLevel.min - streak !== 1 ? "s" : ""} to {nextLevel.name}
              </p>
            )}
          </div>
        </div>
        {best > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 shrink-0">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400 text-[11px] font-medium tabular-nums">Best {best}</span>
          </div>
        )}
      </div>

      {/* Big streak number + emoji */}
      <div className="flex items-end gap-2 mb-4">
        <span className={cn("text-foreground text-5xl font-display leading-none tabular-nums", burst && "animate-claim-burst")}>{streak}</span>
        <span className="text-muted-foreground text-sm mb-1.5">day{streak !== 1 ? "s" : ""}</span>
        <span className="text-2xl mb-1 ml-auto">{currentLevel.emoji}</span>
      </div>

      {/* Level progress bar */}
      {nextLevel && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-muted-foreground text-[11px]">Progress to {nextLevel.name}</span>
            <span className="text-muted-foreground text-[11px] tabular-nums">{streak} / {nextLevel.min}</span>
          </div>
          <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full accent-gradient transition-all duration-700"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Weekly progress — 7 day dots */}
      <div className="flex items-center justify-between gap-1.5 mb-4">
        {weekDays.map((d, i) => {
          const completed = isDayCompleted(d);
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-muted-foreground text-[10px] font-medium">{dayLabels[i]}</span>
              <div
                className={cn(
                  "w-full aspect-square max-w-[28px] rounded-xl flex items-center justify-center transition-all",
                  completed
                    ? "accent-gradient shadow-[0_0_10px_rgba(255,140,66,0.4)]"
                    : isToday
                    ? "bg-foreground/10 dark:bg-white/10 border border-[#FF8C42]/40"
                    : "bg-foreground/10"
                )}
              >
                {completed && <Flame className="w-3 h-3 text-white" fill="white" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Claim button or countdown */}
      {showClaimButton ? (
        <button
          onClick={handleClaim}
          className="w-full accent-gradient text-white rounded-full py-3 font-semibold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2 animate-spring-in"
        >
          <Gift className="w-4 h-4" />
          Claim Today's Streak
        </button>
      ) : (
        <StreakCountdown streak={streak} />
      )}
    </div>
  );
}