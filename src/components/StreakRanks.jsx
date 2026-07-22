import React from "react";
import { Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared streak level definitions — single source of truth.
export const STREAK_LEVELS = [
  { min: 1, max: 6, level: 1, name: "Sprout", emoji: "🌱" },
  { min: 7, max: 13, level: 2, name: "Spark", emoji: "✨" },
  { min: 14, max: 29, level: 3, name: "Steady", emoji: "🌿" },
  { min: 30, max: 59, level: 4, name: "Flame Keeper", emoji: "🔥" },
  { min: 60, max: 99, level: 5, name: "Zen Master", emoji: "🧘" },
  { min: 100, max: Infinity, level: 6, name: "Sage", emoji: "🏔️" },
];

export function getStreakLevel(streak) {
  return STREAK_LEVELS.find((l) => streak >= l.min && streak <= l.max) || STREAK_LEVELS[0];
}

// Full rank ladder — shows all levels so users understand progression and
// what comes next. Current rank is highlighted.
export default function StreakRanks({ streak }) {
  const currentLevel = getStreakLevel(streak || 0);

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium px-1 mb-1">Rank Ladder</p>
      {STREAK_LEVELS.map((lvl) => {
        const isCurrent = lvl.level === currentLevel.level;
        const isPast = streak >= lvl.max;
        const isUnlocked = streak >= lvl.min;
        return (
          <div
            key={lvl.level}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all",
              isCurrent
                ? "accent-gradient shadow-md shadow-orange-500/20"
                : isUnlocked
                ? "bg-foreground/5"
                : "opacity-50"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0",
              isCurrent ? "bg-white/25" : isUnlocked ? "glass-frost" : "bg-foreground/5"
            )}>
              {lvl.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-semibold text-sm",
                isCurrent ? "text-white" : "text-foreground"
              )}>
                {lvl.name}
              </p>
              <p className={cn(
                "text-xs",
                isCurrent ? "text-white/70" : "text-muted-foreground"
              )}>
                {lvl.max === Infinity
                  ? `${lvl.min}+ days`
                  : `${lvl.min}–${lvl.max} days`}
              </p>
            </div>
            {isCurrent && (
              <span className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-1 shrink-0">
                <Flame className="w-3 h-3" fill="white" /> Now
              </span>
            )}
            {isPast && !isCurrent && (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={3} />
            )}
          </div>
        );
      })}
    </div>
  );
}